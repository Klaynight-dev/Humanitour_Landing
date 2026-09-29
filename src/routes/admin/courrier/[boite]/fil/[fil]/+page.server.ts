import { error, fail, redirect } from '@sveltejs/kit';
import { recordAudit } from '$lib/server/audit';
import { prisma } from '$lib/server/db';
import { requireThread } from '$lib/server/mail/access';
import { deleteThreads } from '$lib/server/mail/cleanup';
import { readCompose } from '$lib/server/mail/compose';
import { siteOrigin } from '$lib/server/mail/config';
import { sendFromMailbox } from '$lib/server/mail/outbound';
import { isSpoofed } from '$lib/server/mail/routing';
import { storage } from '$lib/server/storage';
import { bulkUpdate } from '$lib/shared/mail/folders';
import type { Actions, PageServerLoad } from './$types';

/**
 * Un fil ouvert : ses messages dans l'ordre, et le formulaire de reponse.
 *
 * L'ouvrir le marque comme lu. La liste desactive le prechargement au survol
 * de ses liens pour que ce soit bien l'ouverture, et pas un passage de souris,
 * qui compte.
 */

/** Une image integree plus lourde n'est pas recopiee dans la page : elle reste en piece jointe. */
const INLINE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

/**
 * Remplace les `cid:` d'un HTML recu par le contenu des images integrees.
 *
 * Le cadre qui affiche le message n'a pas d'origine (sandbox sans
 * `allow-same-origin`) : il ne pourrait pas charger une image servie par le
 * back-office, qui exige la session. L'image voyage donc dans le document, en
 * `data:`. Resend le fait deja le plus souvent ; ceci couvre le reste.
 */
async function inlineImages(
	html: string,
	attachments: {
		contentId: string | null;
		inline: boolean;
		contentType: string;
		size: number;
		storageKey: string;
	}[]
): Promise<string> {
	if (!html.includes('cid:')) return html;

	let result = html;
	for (const attachment of attachments) {
		if (!attachment.inline || !attachment.contentId || attachment.size > INLINE_IMAGE_MAX_BYTES)
			continue;
		const bytes = await storage()
			.get(attachment.storageKey)
			.catch(() => null);
		if (!bytes) continue;
		const uri = `data:${attachment.contentType};base64,${Buffer.from(bytes).toString('base64')}`;
		const id = attachment.contentId.replace(/^<|>$/g, '');
		result = result.split(`cid:${id}`).join(uri);
	}
	return result;
}

/** Les resultats SPF/DKIM/DMARC tels qu'enregistres, ou rien s'ils manquent. */
function authenticationOf(value: unknown): Record<string, string> {
	if (value === null || typeof value !== 'object' || Array.isArray(value)) return {};
	return Object.fromEntries(
		Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
	);
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const { mailbox, thread } = await requireThread(locals.user, params.boite, params.fil);

	if (thread.unread) {
		await prisma.mailThread.update({ where: { id: thread.id }, data: { unread: false } });
	}

	const messages = await prisma.mailMessage.findMany({
		where: { threadId: thread.id },
		orderBy: { sentAt: 'asc' },
		include: {
			attachments: true,
			sentBy: { select: { displayName: true } }
		}
	});

	const rendered = await Promise.all(
		messages.map(async ({ attachments, authentication, ...message }) => ({
			...message,
			html: message.html ? await inlineImages(message.html, attachments) : null,
			spoofed: isSpoofed(authenticationOf(authentication)),
			attachments: attachments
				.filter((attachment) => !attachment.inline)
				.map(({ id, filename, contentType, size }) => ({ id, filename, contentType, size }))
		}))
	);

	return {
		thread: { ...thread, unread: false },
		messages: rendered,
		signature: mailbox.signature
	};
};

export const actions: Actions = {
	send: async ({ locals, params, request, url }) => {
		const { user, mailbox, thread } = await requireThread(locals.user, params.boite, params.fil);
		const form = await request.formData();
		const mode = String(form.get('mode') ?? 'reponse');
		const messageId = String(form.get('messageId') ?? '');

		const source = await prisma.mailMessage.findFirst({
			where: { id: messageId, threadId: thread.id },
			include: { attachments: { where: { inline: false } } }
		});
		if (!source) return fail(404, { message: 'Le message auquel vous répondez n’existe plus.' });

		const parsed = readCompose(form);
		if (!parsed.ok) {
			return fail(400, { message: parsed.message, compose: { mode, messageId, ...parsed.values } });
		}

		const forwarding = mode === 'transfert';
		let threadId: string;
		try {
			({ threadId } = await sendFromMailbox({
				mailbox,
				userId: user.id,
				to: parsed.to,
				cc: parsed.cc,
				bcc: parsed.bcc,
				subject: parsed.subject,
				markdown: parsed.markdown,
				files: parsed.files,
				// Un transfert ouvre un nouveau fil : il s'adresse a quelqu'un
				// d'autre, et ses reponses ne concernent pas l'echange d'origine.
				threadId: forwarding ? null : thread.id,
				quoted: { mode: forwarding ? 'forward' : 'reply', message: source },
				origin: siteOrigin(url.origin)
			}));
		} catch (caught) {
			const detail = caught instanceof Error ? caught.message : String(caught);
			return fail(502, {
				message: `Message non envoyé : ${detail}`,
				compose: {
					mode,
					messageId,
					to: parsed.to.join(', '),
					cc: parsed.cc.join(', '),
					bcc: parsed.bcc.join(', '),
					subject: parsed.subject,
					markdown: parsed.markdown
				}
			});
		}

		if (forwarding) redirect(303, `/admin/courrier/${mailbox.id}/fil/${threadId}`);
		return { message: 'Message envoyé.' };
	},

	move: async ({ locals, params, request }) => {
		const { mailbox, thread } = await requireThread(locals.user, params.boite, params.fil);
		const form = await request.formData();
		const op = String(form.get('op') ?? '');

		const data = bulkUpdate(op);
		if (data === null) return fail(400, { message: 'Action inconnue.' });
		await prisma.mailThread.update({ where: { id: thread.id }, data });

		// Deplacer ou marquer non lu, c'est en avoir fini avec ce fil pour
		// l'instant : on revient a la liste. Suivre, on reste.
		if (op === 'suivre') return { message: 'Fil suivi : il apparaît dans « Suivis ».' };
		if (op === 'nepassuivre') return { message: 'Fil retiré des suivis.' };
		redirect(303, `/admin/courrier/${mailbox.id}`);
	},

	deleteForever: async ({ locals, params }) => {
		const { user, mailbox, thread } = await requireThread(locals.user, params.boite, params.fil);
		if (thread.folder !== 'TRASH')
			error(400, 'Seul un fil de la corbeille se supprime définitivement.');

		await deleteThreads({ mailboxId: mailbox.id, id: { in: [thread.id] } });
		await recordAudit({
			actorId: user.id,
			action: 'mail.delete',
			entity: 'MailThread',
			entityId: thread.id,
			metadata: { mailbox: mailbox.address }
		});

		redirect(303, `/admin/courrier/${mailbox.id}?dossier=corbeille`);
	}
};
