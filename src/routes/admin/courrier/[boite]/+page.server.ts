import { fail } from '@sveltejs/kit';
import { recordAudit } from '$lib/server/audit';
import { prisma } from '$lib/server/db';
import { requireMailbox } from '$lib/server/mail/access';
import { deleteThreads } from '$lib/server/mail/cleanup';
import { bulkUpdate, folderView, viewFilter } from '$lib/shared/mail/folders';
import type { Actions, PageServerLoad } from './$types';

/**
 * La liste des fils d'une boite, par vue, avec recherche.
 *
 * La recherche porte sur l'objet, l'expediteur et le texte des messages. Elle
 * reste dans la boite : chercher ne fait jamais sortir un fil d'une boite que
 * le compte ne lit pas.
 */

const PAGE_SIZE = 40;

function readPage(raw: string | null): number {
	const value = Number.parseInt(raw ?? '1', 10);
	return Number.isFinite(value) && value > 1 ? value : 1;
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const { mailbox } = await requireMailbox(locals.user, params.boite);

	const view = folderView(url.searchParams.get('dossier'));
	const search = (url.searchParams.get('q') ?? '').trim();
	const page = readPage(url.searchParams.get('page'));

	const contains = { contains: search, mode: 'insensitive' as const };
	const where = {
		mailboxId: mailbox.id,
		...viewFilter(view.key),
		...(search === ''
			? {}
			: {
					OR: [
						{ subject: contains },
						{
							messages: {
								some: {
									OR: [{ fromAddress: contains }, { fromName: contains }, { text: contains }]
								}
							}
						}
					]
				})
	};

	const [threads, total] = await Promise.all([
		prisma.mailThread.findMany({
			where,
			orderBy: { lastMessageAt: 'desc' },
			skip: (page - 1) * PAGE_SIZE,
			take: PAGE_SIZE,
			select: {
				id: true,
				subject: true,
				snippet: true,
				participants: true,
				unread: true,
				starred: true,
				hasAttachments: true,
				lastMessageAt: true,
				folder: true,
				_count: { select: { messages: true } },
				messages: {
					orderBy: { sentAt: 'desc' },
					take: 1,
					select: { direction: true, fromName: true, fromAddress: true, status: true }
				}
			}
		}),
		prisma.mailThread.count({ where })
	]);

	return {
		view,
		search,
		page,
		pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
		total,
		threads: threads.map(({ messages, _count, ...thread }) => ({
			...thread,
			count: _count.messages,
			last: messages[0] ?? null
		}))
	};
};

export const actions: Actions = {
	/**
	 * Action groupee sur les fils coches : deplacer, marquer, suivre.
	 * Les identifiants sont filtres par la boite : un identifiant d'une autre
	 * boite glisse dans le formulaire ne touche a rien.
	 */
	bulk: async ({ locals, params, request }) => {
		const { mailbox } = await requireMailbox(locals.user, params.boite);

		const form = await request.formData();
		const ids = form.getAll('ids').map(String);
		const op = String(form.get('op') ?? '');
		if (ids.length === 0) return fail(400, { message: 'Cochez au moins un fil.' });

		const where = { mailboxId: mailbox.id, id: { in: ids } };
		const data = bulkUpdate(op);
		if (data === null) return fail(400, { message: 'Action inconnue.' });

		const { count } = await prisma.mailThread.updateMany({ where, data });
		return { message: `${count} fil${count > 1 ? 's' : ''} mis à jour.` };
	},

	emptyTrash: async ({ locals, params }) => {
		const { user, mailbox } = await requireMailbox(locals.user, params.boite);

		const count = await deleteThreads({ mailboxId: mailbox.id, folder: 'TRASH' });
		await recordAudit({
			actorId: user.id,
			action: 'mail.emptyTrash',
			entity: 'Mailbox',
			entityId: mailbox.id,
			metadata: { threads: count }
		});

		return {
			message: `Corbeille vidée : ${count} fil${count > 1 ? 's' : ''} supprimé${count > 1 ? 's' : ''} définitivement.`
		};
	}
};
