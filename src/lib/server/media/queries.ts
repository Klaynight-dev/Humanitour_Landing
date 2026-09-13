import type { MediaKind, MediaRecord } from '$lib/shared/media';
import { prisma } from '../db';
import type { Prisma } from '../prisma-client/client';

/**
 * Acces en lecture a la mediatheque publique.
 *
 * Un media est public quand son statut le permet ET que sa date de publication
 * est passee. Programmer une parution ne demande donc aucune tache planifiee :
 * l article apparait de lui-meme a l heure dite, et rien ne peut rester
 * « programme » mais visible par erreur.
 */

/** Condition de visibilite publique, utilisee par toutes les lectures. */
function publicFilter(): Prisma.MediaItemWhereInput {
	return {
		status: { in: ['PUBLISHED', 'SCHEDULED'] },
		publishedAt: { not: null, lte: new Date() }
	};
}

const RECORD_SELECT = {
	slug: true,
	kind: true,
	title: true,
	excerpt: true,
	body: true,
	coverUrl: true,
	coverAlt: true,
	publishedAt: true,
	tags: true,
	data: true,
	author: { select: { displayName: true } }
} satisfies Prisma.MediaItemSelect;

type RawRecord = Prisma.MediaItemGetPayload<{ select: typeof RECORD_SELECT }>;

function toRecord(row: RawRecord): MediaRecord {
	return {
		slug: row.slug,
		kind: row.kind as MediaKind,
		title: row.title,
		excerpt: row.excerpt,
		body: row.body,
		coverUrl: row.coverUrl,
		coverAlt: row.coverAlt,
		publishedAt: row.publishedAt,
		tags: row.tags,
		data: (row.data ?? {}) as Record<string, unknown>,
		authorName: row.author?.displayName ?? null
	};
}

export interface MediaListOptions {
	/** Restreint a une nature de media. `null` les prend toutes. */
	readonly kind?: MediaKind | null;
	readonly limit?: number;
}

export async function listPublishedMedia(options: MediaListOptions = {}): Promise<MediaRecord[]> {
	const rows = await prisma.mediaItem.findMany({
		where: { ...publicFilter(), ...(options.kind ? { kind: options.kind } : {}) },
		orderBy: { publishedAt: 'desc' },
		take: options.limit,
		select: RECORD_SELECT
	});

	return rows.map(toRecord);
}

export async function getPublishedMedia(slug: string): Promise<MediaRecord | null> {
	const row = await prisma.mediaItem.findFirst({
		where: { slug, ...publicFilter() },
		select: RECORD_SELECT
	});

	return row ? toRecord(row) : null;
}

/** Effectifs par nature, pour les onglets de filtre. */
export async function countMediaByKind(): Promise<Map<MediaKind, number>> {
	const rows = await prisma.mediaItem.groupBy({
		by: ['kind'],
		where: publicFilter(),
		_count: true
	});

	return new Map(rows.map((row) => [row.kind as MediaKind, row._count]));
}

/**
 * Medias voisins, pour la fin d un article.
 *
 * Exclut celui qu on lit : se proposer soi-meme en « a lire ensuite » est une
 * petite negligence qui se voit tout de suite.
 */
export async function listRelatedMedia(slug: string, limit = 3): Promise<MediaRecord[]> {
	const rows = await prisma.mediaItem.findMany({
		where: { ...publicFilter(), slug: { not: slug } },
		orderBy: { publishedAt: 'desc' },
		take: limit,
		select: RECORD_SELECT
	});

	return rows.map(toRecord);
}
