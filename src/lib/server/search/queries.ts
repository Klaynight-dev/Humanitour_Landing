import { prisma } from '$lib/server/db';
import { can, type PermissionHolder } from '$lib/shared/permissions';
import type { SearchHit } from './rank';

/**
 * Recherche transverse du back-office.
 *
 * Chaque domaine n'est interroge QUE si le compte a la permission de lecture
 * correspondante. La recherche ne doit pas devenir la porte derobee qui montre
 * ce que l'ecran de liste cache : la garde est ici, avant la requete, pas dans
 * l'affichage.
 */
const PER_DOMAIN = 10;

async function findSurveys(query: string): Promise<SearchHit[]> {
	const rows = await prisma.survey.findMany({
		where: {
			OR: [
				{ title: { contains: query, mode: 'insensitive' } },
				{ slug: { contains: query, mode: 'insensitive' } }
			]
		},
		orderBy: { updatedAt: 'desc' },
		take: PER_DOMAIN,
		select: { id: true, title: true, slug: true, status: true, updatedAt: true }
	});

	return rows.map((row) => ({
		kind: 'survey' as const,
		id: row.id,
		title: row.title,
		subtitle: `/donnees/${row.slug}`,
		href: `/admin/sondages/${row.id}`,
		updatedAt: row.updatedAt
	}));
}

async function findMedia(query: string): Promise<SearchHit[]> {
	const rows = await prisma.mediaItem.findMany({
		where: {
			OR: [
				{ title: { contains: query, mode: 'insensitive' } },
				{ slug: { contains: query, mode: 'insensitive' } },
				{ excerpt: { contains: query, mode: 'insensitive' } }
			]
		},
		orderBy: { updatedAt: 'desc' },
		take: PER_DOMAIN,
		select: { id: true, title: true, slug: true, updatedAt: true }
	});

	return rows.map((row) => ({
		kind: 'media' as const,
		id: row.id,
		title: row.title,
		subtitle: `/medias/${row.slug}`,
		href: `/admin/medias/${row.id}`,
		updatedAt: row.updatedAt
	}));
}

async function findUsers(query: string): Promise<SearchHit[]> {
	const rows = await prisma.user.findMany({
		where: {
			OR: [
				{ displayName: { contains: query, mode: 'insensitive' } },
				{ email: { contains: query, mode: 'insensitive' } }
			]
		},
		orderBy: { displayName: 'asc' },
		take: PER_DOMAIN,
		select: { id: true, displayName: true, email: true, updatedAt: true }
	});

	return rows.map((row) => ({
		kind: 'user' as const,
		id: row.id,
		title: row.displayName,
		subtitle: row.email,
		href: '/admin/equipe',
		updatedAt: row.updatedAt
	}));
}

export async function searchAll(
	user: PermissionHolder | null,
	query: string
): Promise<SearchHit[]> {
	if (query.trim() === '') return [];

	const batches = await Promise.all([
		can(user, 'survey.read') ? findSurveys(query) : [],
		can(user, 'media.read') ? findMedia(query) : [],
		can(user, 'user.read') ? findUsers(query) : []
	]);

	return batches.flat();
}
