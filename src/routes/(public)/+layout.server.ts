import { contentTokens } from '$lib/server/content/queries';
import { TEAM, type TeamMember } from '$lib/shared/site';
import type { LayoutServerLoad } from './$types';

/**
 * Ce dont les sections editables ont besoin, sur toutes les pages publiques.
 *
 * Charge ici plutot que page par page : les sections se deplacent d'une page a
 * l'autre depuis le back-office, et une section qui cite le seuil d'anonymat
 * doit l'afficher ou qu'on la pose.
 */

/**
 * Ordre de lecture different a chaque chargement.
 *
 * Sans cela, l'equipe se lit toujours dans le meme ordre et les premieres
 * fiches recoivent plus d'attention que les dernieres. Le tirage a lieu sur le
 * serveur : tire dans le composant, il donnerait un ordre au rendu serveur et
 * un autre a l'hydratation, et les portraits sauteraient a l'ecran.
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

export const load: LayoutServerLoad = async () => {
	return { tokens: await contentTokens(), team: shuffled(TEAM) };
};
