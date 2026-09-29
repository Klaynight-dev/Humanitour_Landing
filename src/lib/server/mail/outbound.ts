import { randomUUID } from 'node:crypto';
import { recordAudit } from '$lib/server/audit';
import { prisma } from '$lib/server/db';
import { safeKeySegment, storage } from '$lib/server/storage';
import {
	baseSubject,
	formatMailbox,
	forwardHeader,
	quoteHeader,
	replyReferences,
	snippet
} from '$lib/shared/mail/address';
import { plainEmail } from '$lib/shared/mail/layout';
import { mailDomain, resend } from './config';
import { MAIL_KINDS } from './events';
import type { OutgoingAttachment } from './resend';
import { mergeParticipants, participantsOf } from './routing';

/**
 * Envoi depuis une boite de la messagerie : nouveau message, reponse,
 * transfert.
 *
 * L'ordre est choisi pour ne jamais afficher comme envoye un courriel qui
 * n'est pas parti : Resend d'abord, la base ensuite. Si Resend refuse, rien
 * n'est ecrit et l'erreur remonte a l'ecran, texte saisi conserve.
 *
 * Le `Message-ID` est fixe ici plutot que laisse a Resend : c'est lui que la
 * reponse du correspondant citera dans `In-Reply-To`, et c'est par lui que
 * `inbound.ts` la rattachera au bon fil.
 */

export interface QuotedMessage {
	readonly messageId: string | null;
	readonly references: string | null;
	readonly subject: string;
	readonly text: string | null;
	readonly sentAt: Date;
	readonly fromAddress: string;
	readonly fromName: string | null;
	readonly to: readonly string[];
	readonly attachments: readonly StoredFile[];
}

interface StoredFile {
	readonly filename: string;
	readonly contentType: string;
	readonly size: number;
	readonly storageKey: string;
}

export interface ComposeInput {
	readonly mailbox: {
		readonly id: string;
		readonly address: string;
		readonly displayName: string;
		readonly signature: string | null;
	};
	readonly userId: string;
	readonly to: readonly string[];
	readonly cc: readonly string[];
	readonly bcc: readonly string[];
	readonly subject: string;
	readonly markdown: string;
	readonly files: readonly File[];
	/** Le fil de la reponse ; absent pour un nouveau message ou un transfert. */
	readonly threadId: string | null;
	readonly quoted: { readonly mode: 'reply' | 'forward'; readonly message: QuotedMessage } | null;
	readonly origin: string;
}

function quoteBlock(quoted: NonNullable<ComposeInput['quoted']>) {
	const { message } = quoted;
	const from = { name: message.fromName, address: message.fromAddress };
	const header =
		quoted.mode === 'reply'
			? quoteHeader(message.sentAt, from)
			: forwardHeader({ date: message.sentAt, from, to: message.to, subject: message.subject });
	return { header, text: message.text ?? '' };
}

/** Recopie les fichiers joints dans le stockage, et les prepare pour Resend. */
async function prepareFiles(input: ComposeInput) {
	const folder = `courrier/sortant/${randomUUID()}`;
	const stored: StoredFile[] = [];
	const outgoing: OutgoingAttachment[] = [];

	for (const [index, file] of input.files.entries()) {
		const bytes = new Uint8Array(await file.arrayBuffer());
		const contentType = file.type || 'application/octet-stream';
		// Le rang evite que deux fichiers de meme nom s'ecrasent.
		const storageKey = `${folder}/${index}-${safeKeySegment(file.name)}`;
		await storage().put(storageKey, bytes, contentType);
		stored.push({ filename: file.name, contentType, size: bytes.byteLength, storageKey });
		outgoing.push({
			filename: file.name,
			content: Buffer.from(bytes).toString('base64'),
			contentType
		});
	}

	// Un transfert emporte les pieces jointes du message d'origine, comme dans
	// toute messagerie. Elles sont deja dans le stockage : on reference la meme
	// cle plutot que de dupliquer le fichier.
	if (input.quoted?.mode === 'forward') {
		for (const file of input.quoted.message.attachments) {
			const bytes = await storage().get(file.storageKey);
			stored.push(file);
			outgoing.push({
				filename: file.filename,
				content: Buffer.from(bytes).toString('base64'),
				contentType: file.contentType
			});
		}
	}

	return { stored, outgoing, created: stored.filter((file) => file.storageKey.startsWith(folder)) };
}

async function threadFor(input: ComposeInput, participants: string[], sentAt: Date) {
	if (input.threadId) {
		const thread = await prisma.mailThread.findFirst({
			where: { id: input.threadId, mailboxId: input.mailbox.id }
		});
		if (thread) return thread;
	}

	// Un fil ouvert par l'equipe n'encombre pas la boite de reception : il vit
	// dans « Envoyes » (et les archives) jusqu'a ce que le correspondant
	// reponde, ce qui le ramene en reception (`routing.ts`, `folderAfterReply`).
	return prisma.mailThread.create({
		data: {
			mailboxId: input.mailbox.id,
			subject: input.subject,
			baseSubject: baseSubject(input.subject),
			folder: 'ARCHIVE',
			unread: false,
			participants,
			lastMessageAt: sentAt
		}
	});
}

export async function sendFromMailbox(input: ComposeInput): Promise<{ threadId: string }> {
	const messageId = `<${randomUUID()}@${mailDomain()}>`;
	const replyingTo = input.quoted?.mode === 'reply' ? input.quoted.message : null;
	const references = replyingTo
		? replyReferences(replyingTo.references, replyingTo.messageId)
		: null;

	const rendered = plainEmail({
		subject: input.subject,
		markdown: input.markdown,
		signature: input.mailbox.signature,
		quoted: input.quoted ? quoteBlock(input.quoted) : null,
		origin: input.origin
	});

	const headers: Record<string, string> = { 'Message-ID': messageId };
	if (replyingTo?.messageId) headers['In-Reply-To'] = replyingTo.messageId;
	if (references) headers.References = references;

	const files = await prepareFiles(input);

	const { id: resendId } = await resend()
		.send(
			{
				from: formatMailbox({ name: input.mailbox.displayName, address: input.mailbox.address }),
				to: input.to,
				cc: input.cc,
				bcc: input.bcc,
				subject: input.subject,
				html: rendered.html,
				text: rendered.text,
				headers,
				attachments: files.outgoing,
				tags: { kind: MAIL_KINDS.mailbox }
			},
			messageId
		)
		.catch(async (error: unknown) => {
			// Rien n'est parti : les fichiers deposes pour cet envoi ne servent a rien.
			await Promise.all(
				files.created.map((file) =>
					storage()
						.remove(file.storageKey)
						.catch(() => undefined)
				)
			);
			throw error;
		});

	const sentAt = new Date();
	const participants = participantsOf(
		[...input.to, ...input.cc, ...input.bcc],
		input.mailbox.address
	);
	const thread = await threadFor(input, participants, sentAt);

	await prisma.mailMessage.create({
		data: {
			threadId: thread.id,
			mailboxId: input.mailbox.id,
			direction: 'OUTBOUND',
			status: 'SENT',
			resendId,
			messageId,
			inReplyTo: replyingTo?.messageId ?? null,
			references,
			fromAddress: input.mailbox.address,
			fromName: input.mailbox.displayName,
			to: [...input.to],
			cc: [...input.cc],
			bcc: [...input.bcc],
			replyTo: [],
			subject: input.subject,
			text: rendered.text,
			html: rendered.html,
			sentById: input.userId,
			sentAt,
			attachments: { create: files.stored.map((file) => ({ ...file, inline: false })) }
		}
	});

	await prisma.mailThread.update({
		where: { id: thread.id },
		data: {
			hasOutbound: true,
			unread: false,
			snippet: snippet(input.markdown),
			lastMessageAt: sentAt,
			participants: mergeParticipants(thread.participants, participants),
			hasAttachments: thread.hasAttachments || files.stored.length > 0
		}
	});

	await recordAudit({
		actorId: input.userId,
		action: 'mail.send',
		entity: 'MailThread',
		entityId: thread.id,
		// Ni le contenu ni les adresses : le journal dit qui a ecrit depuis
		// quelle boite, il ne devient pas une copie du courrier.
		metadata: {
			mailbox: input.mailbox.address,
			recipients: input.to.length + input.cc.length + input.bcc.length,
			attachments: files.stored.length
		}
	});

	return { threadId: thread.id };
}
