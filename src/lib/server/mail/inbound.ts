import { prisma } from '$lib/server/db';
import { storage } from '$lib/server/storage';
import { baseSubject, messageIds, parseMailbox, snippet } from '$lib/shared/mail/address';
import { resend } from './config';
import { publishMailbox } from './live';
import type { ReceivedAttachment, ReceivedEmail } from './resend';
import {
	attachmentKey,
	folderAfterReply,
	isInlineAttachment,
	isSpoofed,
	mergeParticipants,
	participantsOf,
	routeToMailboxes
} from './routing';

/**
 * Reception d'un courriel annonce par le webhook `email.received`.
 *
 * Le webhook ne porte que des metadonnees : le corps, les en-tetes et les
 * pieces jointes se relisent chez Resend, avec la cle d'API. Comme pour
 * Openforms, c'est la lecture authentifiee qui fait autorite, pas la charge du
 * webhook — meme si celle-ci est signee.
 *
 * Idempotente : `MailMessage` est unique par `(mailboxId, resendId)`. Un
 * webhook rejoue par Resend apres un delai d'attente ne cree rien de plus.
 */

/** Au-dela, une reponse sans `In-Reply-To` ouvre un nouveau fil plutot que de rouvrir un ancien. */
const SUBJECT_THREAD_WINDOW_MS = 60 * 24 * 60 * 60 * 1000;

export interface InboundOutcome {
	readonly delivered: number;
	readonly duplicates: number;
	/** Aucune boite, pas meme l'attrape-tout : le courriel n'est remis a personne. */
	readonly undeliverable: boolean;
}

interface StoredAttachment {
	readonly filename: string;
	readonly contentType: string;
	readonly size: number;
	readonly contentId: string | null;
	readonly inline: boolean;
	readonly storageKey: string;
}

/**
 * Recopie les pieces jointes dans le stockage, une seule fois par courriel
 * meme s'il entre dans plusieurs boites. Les adresses de Resend expirent au
 * bout d'une heure : attendre qu'on ouvre le message, c'est les perdre.
 */
async function storeAttachments(
	email: ReceivedEmail,
	listed: readonly ReceivedAttachment[]
): Promise<StoredAttachment[]> {
	const stored: StoredAttachment[] = [];

	for (const attachment of listed) {
		if (!attachment.downloadUrl) continue;

		const key = attachmentKey(email.id, attachment.id, attachment.filename);
		const contentType = attachment.contentType ?? 'application/octet-stream';
		const bytes = await resend().download(attachment.downloadUrl);
		await storage().put(key, bytes, contentType);

		stored.push({
			filename: attachment.filename ?? 'piece-jointe',
			contentType,
			size: bytes.byteLength,
			contentId: attachment.contentId,
			inline: isInlineAttachment(attachment.contentDisposition, attachment.contentId),
			storageKey: key
		});
	}

	return stored;
}

/**
 * Le fil auquel rattacher le courriel, dans cette boite.
 *
 * D'abord par les en-tetes : `In-Reply-To` et `References` nomment le message
 * auquel on repond. A defaut, par l'objet, mais seulement s'il porte un
 * prefixe de reponse, vient d'un correspondant deja present dans le fil, et
 * que ce fil a vecu recemment : deux courriels intitules « Question »
 * envoyes a six mois d'ecart par deux personnes ne parlent pas de la meme chose.
 */
async function findThread(
	mailboxId: string,
	email: ReceivedEmail,
	sender: string
): Promise<string | null> {
	const ids = [
		...messageIds(email.headers['in-reply-to']),
		...messageIds(email.headers.references)
	];

	if (ids.length > 0) {
		const known = await prisma.mailMessage.findFirst({
			where: { mailboxId, messageId: { in: ids } },
			orderBy: { sentAt: 'desc' },
			select: { threadId: true }
		});
		if (known) return known.threadId;
	}

	const base = baseSubject(email.subject);
	const isReply = base !== '' && base !== email.subject.trim();
	if (!isReply) return null;

	const thread = await prisma.mailThread.findFirst({
		where: {
			mailboxId,
			baseSubject: base,
			participants: { has: sender },
			lastMessageAt: { gte: new Date(Date.now() - SUBJECT_THREAD_WINDOW_MS) }
		},
		orderBy: { lastMessageAt: 'desc' },
		select: { id: true }
	});

	return thread?.id ?? null;
}

/** L'expediteur tel qu'affiche : l'en-tete `From` porte le nom, `from` parfois seulement l'adresse. */
function senderOf(email: ReceivedEmail): { name: string | null; address: string } {
	const from = parseMailbox(email.headers.from ?? '') ?? parseMailbox(email.from);
	return { name: from?.name ?? null, address: from?.address ?? email.from };
}

async function openThread(
	mailboxId: string,
	email: ReceivedEmail,
	sender: string,
	participants: string[],
	sentAt: Date
) {
	const threadId = await findThread(mailboxId, email, sender);
	if (threadId) return prisma.mailThread.findUniqueOrThrow({ where: { id: threadId } });

	return prisma.mailThread.create({
		data: {
			mailboxId,
			subject: email.subject.trim() || '(sans objet)',
			baseSubject: baseSubject(email.subject),
			folder: isSpoofed(email.authentication) ? 'SPAM' : 'INBOX',
			participants,
			lastMessageAt: sentAt
		}
	});
}

async function deliverToMailbox(
	mailbox: { id: string; address: string },
	email: ReceivedEmail,
	attachments: readonly StoredAttachment[]
): Promise<boolean> {
	const existing = await prisma.mailMessage.findUnique({
		where: { mailboxId_resendId: { mailboxId: mailbox.id, resendId: email.id } },
		select: { id: true }
	});
	if (existing) return false;

	const sender = senderOf(email);
	const sentAt = new Date(email.createdAt);
	const participants = participantsOf([email.from, ...email.to, ...email.cc], mailbox.address);
	const thread = await openThread(mailbox.id, email, sender.address, participants, sentAt);

	await prisma.mailMessage.create({
		data: {
			threadId: thread.id,
			mailboxId: mailbox.id,
			direction: 'INBOUND',
			status: 'RECEIVED',
			resendId: email.id,
			messageId: email.messageId,
			inReplyTo: email.headers['in-reply-to'] ?? null,
			references: email.headers.references ?? null,
			fromAddress: sender.address,
			fromName: sender.name,
			to: [...email.to],
			cc: [...email.cc],
			bcc: [...email.bcc],
			replyTo: [...email.replyTo],
			subject: email.subject,
			text: email.text,
			html: email.html,
			authentication: { ...email.authentication },
			sentAt,
			attachments: { create: attachments.map((attachment) => ({ ...attachment })) }
		}
	});

	await prisma.mailThread.update({
		where: { id: thread.id },
		data: {
			unread: true,
			snippet: snippet(email.text),
			lastMessageAt: sentAt > thread.lastMessageAt ? sentAt : thread.lastMessageAt,
			participants: mergeParticipants(thread.participants, participants),
			hasAttachments: thread.hasAttachments || attachments.some((file) => !file.inline),
			folder: folderAfterReply(thread.folder)
		}
	});

	publishMailbox(mailbox.id);
	return true;
}

export async function receiveEmail(emailId: string): Promise<InboundOutcome> {
	const email = await resend().getReceivedEmail(emailId);

	const mailboxes = await prisma.mailbox.findMany({
		select: { id: true, address: true, isCatchAll: true }
	});
	const targets = routeToMailboxes([...email.receivedFor, ...email.to, ...email.cc], mailboxes);

	if (targets.length === 0) {
		console.error('[courrier] aucune boite pour', email.id, email.to.join(', '));
		return { delivered: 0, duplicates: 0, undeliverable: true };
	}

	const alreadyStored = await prisma.mailMessage.count({
		where: { resendId: email.id, mailboxId: { in: targets } }
	});
	if (alreadyStored === targets.length) {
		return { delivered: 0, duplicates: targets.length, undeliverable: false };
	}

	const listed = await resend().listReceivedAttachments(email.id);
	const attachments = await storeAttachments(email, listed);

	let delivered = 0;
	for (const mailbox of mailboxes.filter((candidate) => targets.includes(candidate.id))) {
		if (await deliverToMailbox(mailbox, email, attachments)) delivered += 1;
	}

	return { delivered, duplicates: targets.length - delivered, undeliverable: false };
}
