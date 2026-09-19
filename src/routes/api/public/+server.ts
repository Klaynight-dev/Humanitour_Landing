import { LICENSES } from '$shared/site';
import { publicJson } from '$lib/server/api/public';
import type { RequestHandler } from './$types';

/**
 * Racine de l API publique : la liste de ce qui existe vraiment.
 *
 * Un point d entree qui annonce des routes non construites est une promesse
 * cassee. Cette liste ne grandit qu avec les routes livrees.
 */
export const GET: RequestHandler = () => {
	return publicJson({
		nom: 'API publique Humanitour',
		version: 1,
		licence: { nom: LICENSES.data.name, url: LICENSES.data.url },
		conditions:
			"Réutilisation libre. Citez Humanitour et rouvrez vos dérivés, comme l'exige l'ODbL.",
		pointsEntree: [
			{
				chemin: '/api/public/sondages',
				description: 'Les enquêtes publiées, avec leurs effectifs.'
			},
			{
				chemin: '/api/public/sondages/{slug}',
				description: 'Une enquête, ses questions et les modalités de chacune.'
			},
			{
				chemin: '/api/public/sondages/{slug}/resultat',
				description:
					"Une distribution ou un croisement. Mêmes paramètres que les permaliens de l'explorateur : x, y, nr, filtre."
			}
		]
	});
};
