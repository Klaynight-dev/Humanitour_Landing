import { prisma } from '$lib/server/db';
import { getNotificationType } from '$lib/shared/notifications';
import { can, type PermissionHolder } from '$lib/shared/permissions';

/**
 * Lecture des notifications.
 *
 * Le filtrage par permission se fait en TypeScript et non en SQL : le modele de
 * permissions vit dans le registre, pas en base, et c'est lui qui dit quelle
 * permission chaque type exige. Filtrer en SQL demanderait de recopier cette
 * table de correspondance dans la requete, ou elle divergerait.
 */
const PAGE_SIZE = 20;

export interface NotificationView {
	readonly id: string;
	readonly type: string;
	readonly title: string;
	readonly description: string;
	readonly href: string;
	readonly actor: string | null;
	readonly createdAt: Date;
	readonly unread: boolean;
}

interface Row {
	id: string;
	type: string;
	data: unknown;
	createdAt: Date;
	actor: { displayName: string } | null;
}

function toView(row: Row, lastReadAt: Date | null): NotificationView | null {
	const type = getNotificationType(row.type);
	if (!type) return null;

	const rendered = type.render((row.data ?? {}) as Record<string, unknown>);

	return {
		id: row.id,
		type: row.type,
		title: rendered.title,
		description: rendered.description,
		href: rendered.href,
		actor: row.actor?.displayName ?? null,
		createdAt: row.createdAt,
		unread: lastReadAt === null || row.createdAt > lastReadAt
	};
}

function visibleTo(user: PermissionHolder | null, typeKey: string): boolean {
	const type = getNotificationType(typeKey);
	if (!type) return false;
	return can(user, type.requiredPermission);
}

/** Marque-page de lecture du compte, `null` s'il n'a jamais ouvert le centre. */
async function lastReadAt(userId: string): Promise<Date | null> {
	const row = await prisma.notificationRead.findUnique({ where: { userId } });
	return row?.lastReadAt ?? null;
}

export async function listNotifications(
	user: (PermissionHolder & { id: string }) | null
): Promise<NotificationView[]> {
	if (!user) return [];

	const marker = await lastReadAt(user.id);
	const rows = await prisma.notification.findMany({
		orderBy: { createdAt: 'desc' },
		// On en lit plus que necessaire : le filtrage par permission se fait
		// ensuite, et il peut en retirer beaucoup pour un compte restreint.
		take: PAGE_SIZE * 3,
		select: {
			id: true,
			type: true,
			data: true,
			createdAt: true,
			actor: { select: { displayName: true } }
		}
	});

	return rows
		.filter((row) => visibleTo(user, row.type))
		.map((row) => toView(row, marker))
		.filter((view): view is NotificationView => view !== null)
		.slice(0, PAGE_SIZE);
}

/** Nombre de notifications non lues et visibles par ce compte. */
export async function unreadCount(
	user: (PermissionHolder & { id: string }) | null
): Promise<number> {
	if (!user) return 0;

	const marker = await lastReadAt(user.id);
	const rows = await prisma.notification.findMany({
		where: marker ? { createdAt: { gt: marker } } : undefined,
		orderBy: { createdAt: 'desc' },
		take: 100,
		select: { type: true }
	});

	return rows.filter((row) => visibleTo(user, row.type)).length;
}

/** Repose le marque-page a maintenant : tout ce qui precede devient lu. */
export async function markAllRead(userId: string): Promise<void> {
	const now = new Date();
	await prisma.notificationRead.upsert({
		where: { userId },
		create: { userId, lastReadAt: now },
		update: { lastReadAt: now }
	});
}
