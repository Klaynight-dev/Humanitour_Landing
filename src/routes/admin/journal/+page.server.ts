import { prisma } from '$lib/server/db';
import { requirePermission } from '$lib/server/rbac/guard';
import type { PageServerLoad } from './$types';

/**
 * Journal d'audit.
 *
 * Pagination par curseur et non par numero de page : le journal s'ecrit pendant
 * qu'on le lit, et une pagination par decalage sauterait ou repeterait des
 * lignes a chaque nouvelle entree.
 */
const PAGE_SIZE = 50;

export const load: PageServerLoad = async ({ locals, url }) => {
	requirePermission(locals.user, 'audit.read');

	const before = url.searchParams.get('avant');
	const search = url.searchParams.get('q')?.trim() ?? '';
	const entity = url.searchParams.get('objet')?.trim() ?? '';

	// Les filtres s'ajoutent au `where` sans toucher au curseur : la cle de tri
	// reste `createdAt`, donc la pagination continue de fonctionner filtre actif.
	const events = await prisma.auditEvent.findMany({
		where: {
			createdAt: before ? { lt: new Date(before) } : undefined,
			entity: entity === '' ? undefined : entity,
			OR: search
				? [
						{ action: { contains: search, mode: 'insensitive' } },
						{ actor: { displayName: { contains: search, mode: 'insensitive' } } }
					]
				: undefined
		},
		orderBy: { createdAt: 'desc' },
		take: PAGE_SIZE + 1,
		select: {
			id: true,
			action: true,
			entity: true,
			entityId: true,
			metadata: true,
			createdAt: true,
			actor: { select: { displayName: true, email: true } }
		}
	});

	const hasMore = events.length > PAGE_SIZE;
	const page = hasMore ? events.slice(0, PAGE_SIZE) : events;

	// Les objets journalises, tels qu'ils existent reellement : la liste suit ce
	// que le journal contient, sans enumeration a tenir a jour ici.
	const entities = await prisma.auditEvent.findMany({
		distinct: ['entity'],
		orderBy: { entity: 'asc' },
		select: { entity: true }
	});

	return {
		filters: { search, entity },
		entities: entities.map((row) => row.entity),
		events: page.map((event) => ({
			id: event.id,
			action: event.action,
			entity: event.entity,
			entityId: event.entityId,
			metadata: JSON.stringify(event.metadata ?? {}),
			createdAt: event.createdAt,
			actor: event.actor?.displayName ?? 'Systeme'
		})),
		nextCursor: hasMore ? page.at(-1)?.createdAt.toISOString() : null
	};
};
