import { json } from '@sveltejs/kit';
import { searchAll } from '$lib/server/search/queries';
import { rank } from '$lib/server/search/rank';
import type { RequestHandler } from './$types';

/**
 * Recherche instantanee de la palette (Ctrl/Cmd + K).
 *
 * Meme fonction que la page `/admin/recherche`, donc memes gardes par
 * permission : la palette ne peut pas montrer ce que la page cacherait. Le hook
 * de session refuse deja la requete d un visiteur non connecte.
 */
const LIMIT = 8;

export const GET: RequestHandler = async ({ locals, url }) => {
	const query = url.searchParams.get('q')?.trim() ?? '';
	const hits = await searchAll(locals.user, query);

	return json({
		results: rank(hits, query, LIMIT).map((hit) => ({
			kind: hit.kind,
			title: hit.title,
			subtitle: hit.subtitle,
			href: hit.href
		}))
	});
};
