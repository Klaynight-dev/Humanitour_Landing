import { resolveThreshold } from '$lib/server/survey/queries';
import type { PageServerLoad } from './$types';

/**
 * Le seuil annonce est le seuil REELLEMENT applique, lu en base.
 *
 * Une page qui affiche « 5 » pendant que la couche d'agregation en applique un
 * autre serait pire que pas de page du tout : c'est exactement le reproche
 * d'opacite adresse aux instituts.
 */
export const load: PageServerLoad = async () => {
	return { threshold: await resolveThreshold({ kAnonymityThreshold: null }) };
};
