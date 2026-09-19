import { publishedBlocks } from '$lib/server/content/queries';
import type { PageServerLoad } from './$types';

/**
 * Accueil.
 *
 * `blocks` vaut `null` tant que la page n'a pas ete publiee au back-office : la
 * page sert alors son contenu d'origine, celui ecrit dans le composant.
 */
export const load: PageServerLoad = async () => {
	return { blocks: await publishedBlocks('HOME') };
};
