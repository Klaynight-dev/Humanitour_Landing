import { pageBlocks } from '$lib/server/content/queries';
import { countMediaByKind, listPublishedMedia } from '$lib/server/media/queries';
import { getMediaType, type MediaKind } from '$lib/shared/media';
import type { PageServerLoad } from './$types';

/**
 * Mediatheque.
 *
 * `?type=` filtre par nature. Une valeur inconnue est ignoree plutot que fatale :
 * un lien partage doit survivre au retrait d'une nature de media.
 */
export const load: PageServerLoad = async ({ url }) => {
	const requested = url.searchParams.get('type');
	const kind = requested && getMediaType(requested) ? (requested as MediaKind) : null;

	const [items, counts, blocks] = await Promise.all([
		listPublishedMedia({ kind }),
		countMediaByKind(),
		pageBlocks('MEDIA')
	]);

	return {
		blocks,
		items,
		activeKind: kind,
		counts: [...counts].map(([key, count]) => ({ key, count })),
		total: [...counts.values()].reduce((acc, count) => acc + count, 0)
	};
};
