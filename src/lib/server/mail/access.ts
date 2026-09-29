import { error } from '@sveltejs/kit';
import type { SessionUser } from '$lib/server/auth/session';
import { prisma } from '$lib/server/db';
import { requirePermission } from '$lib/server/rbac/guard';
import { canUseMailbox } from '$lib/shared/mail/access';

/**
 * Acces aux boites, cote serveur.
 *
 * Chaque route de la messagerie passe par ici : `mail.use` d'abord, puis
 * l'appartenance a la boite (`shared/mail/access.ts`). Une boite, un fil ou une
 * piece jointe hors de portee rend 404 et non 403 : dire « interdit » a qui
 * devine un identifiant confirmerait qu'il existe.
 */

export interface MailboxSummary {
	readonly id: string;
	readonly address: string;
	readonly displayName: string;
	readonly kind: 'SHARED' | 'PERSONAL';
	readonly signature: string | null;
	readonly unread: number;
}

/** Les boites de ce compte : la sienne d'abord, puis les partagees, par adresse. */
export async function mailboxesFor(userId: string): Promise<MailboxSummary[]> {
	const mailboxes = await prisma.mailbox.findMany({
		where: {
			OR: [
				{ ownerId: userId, kind: 'PERSONAL' },
				{ kind: 'SHARED', members: { some: { userId } } }
			]
		},
		orderBy: [{ kind: 'desc' }, { address: 'asc' }],
		select: { id: true, address: true, displayName: true, kind: true, signature: true }
	});

	const unread = await prisma.mailThread.groupBy({
		by: ['mailboxId'],
		where: {
			mailboxId: { in: mailboxes.map((mailbox) => mailbox.id) },
			folder: 'INBOX',
			unread: true
		},
		_count: { _all: true }
	});

	return mailboxes.map((mailbox) => ({
		...mailbox,
		unread: unread.find((row) => row.mailboxId === mailbox.id)?._count._all ?? 0
	}));
}

/** La boite, si ce compte peut la lire ; 404 sinon. */
export async function requireMailbox(user: SessionUser | null, mailboxId: string) {
	const current = requirePermission(user, 'mail.use');

	const mailbox = await prisma.mailbox.findUnique({
		where: { id: mailboxId },
		include: { members: { select: { userId: true } } }
	});

	const allowed =
		mailbox !== null &&
		canUseMailbox(
			{ ...mailbox, memberIds: mailbox.members.map((member) => member.userId) },
			current.id
		);
	if (!mailbox || !allowed) error(404, 'Boîte introuvable.');

	return { user: current, mailbox };
}

/** Le fil, s'il appartient a une boite que ce compte peut lire. */
export async function requireThread(user: SessionUser | null, mailboxId: string, threadId: string) {
	const { user: current, mailbox } = await requireMailbox(user, mailboxId);

	const thread = await prisma.mailThread.findFirst({
		where: { id: threadId, mailboxId: mailbox.id }
	});
	if (!thread) error(404, 'Fil introuvable.');

	return { user: current, mailbox, thread };
}
