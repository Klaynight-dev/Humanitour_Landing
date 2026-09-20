import { pageBlocks } from '$lib/server/content/queries';
import type { PageServerLoad } from './$types';

/**
 * Le seuil annonce est le seuil REELLEMENT applique : il descend par les jetons
 * du contenu (`contentTokens`, charge par la mise en page publique), et les
 * textes le citent au lieu de le recopier. Une page qui afficherait « 5 »
 * pendant que la couche d'agregation en applique un autre serait pire que pas
 * de page du tout — c'est le reproche d'opacite adresse aux instituts.
 */
export const load: PageServerLoad = async () => {
	return { blocks: await pageBlocks('METHOD') };
};
