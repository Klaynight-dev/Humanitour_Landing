import { publishedBlocks } from '$lib/server/content/queries';
import { TEAM, type TeamMember } from '$lib/shared/site';
import type { PageServerLoad } from './$types';

/**
 * Ordre de lecture different a chaque chargement : sans cela, l equipe se lit
 * toujours dans le meme ordre et les premieres fiches recoivent plus
 * d attention que les dernieres.
 */
function shuffled(members: readonly TeamMember[]): TeamMember[] {
	const result = [...members];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const swap = result[i]!;
		result[i] = result[j]!;
		result[j] = swap;
	}
	return result;
}

/**
 * Accueil.
 *
 * `blocks` vaut `null` tant que la page n'a pas ete publiee au back-office : la
 * page sert alors son contenu d'origine, celui ecrit dans le composant.
 */
export const load: PageServerLoad = async () => {
	return { blocks: await publishedBlocks('HOME'), team: shuffled(TEAM) };
};
