import { rank } from '$lib/server/search/rank';
import { searchAll } from '$lib/server/search/queries';
import type { PageServerLoad } from './$types';

/**
 * Recherche transverse.
 *
 * Aucune permission propre : la page est ouverte a tout compte connecte, et ce
 * sont les permissions de lecture de chaque domaine qui decident de ce qui
 * remonte (`searchAll`). Une permission « recherche » supplementaire ne dirait
 * rien de plus et pourrait diverger des ecrans de liste.
 */
const LIMIT = 20;

export const load: PageServerLoad = async ({ locals, url }) => {
	const query = url.searchParams.get('q')?.trim() ?? '';
	const hits = await searchAll(locals.user, query);

	return {
		query,
		results: rank(hits, query, LIMIT).map((hit) => ({
			kind: hit.kind,
			id: hit.id,
			title: hit.title,
			subtitle: hit.subtitle,
			href: hit.href,
			updatedAt: hit.updatedAt
		}))
	};
};
