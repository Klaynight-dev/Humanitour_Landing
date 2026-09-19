import { error } from '@sveltejs/kit';
import { parseExploreParams } from '$shared/explore';
import { buildOutcome } from '$lib/server/survey/explore';
import { getPublishedSurvey, prepareExplore } from '$lib/server/survey/queries';
import { resultToCsv } from '$lib/server/survey/result-csv';
import type { RequestHandler } from './$types';

/**
 * Le resultat AFFICHE, en CSV, filtres compris.
 *
 * Distinct de `export.csv`, qui donne l enquete entiere reponse par reponse.
 * Celui-ci accompagne un graphique qu on reprend : les chiffres exacts qui ont
 * produit l image, et rien d autre. Il prend les memes parametres que la page,
 * donc l adresse d un croisement se transforme en fichier en changeant un seul
 * segment.
 */
export const GET: RequestHandler = async ({ params, url }) => {
	const survey = await getPublishedSurvey(params.slug);
	if (!survey) error(404, { message: "Cette enquete n'existe pas ou n'est pas publiee." });

	const requested = parseExploreParams(url.searchParams);
	const prepared = await prepareExplore(survey, requested);
	if (!prepared) error(500, { message: 'Cette enquete ne comporte aucune question exploitable.' });

	const outcome = buildOutcome({
		x: prepared.x,
		y: prepared.y,
		population: prepared.population,
		threshold: prepared.threshold,
		includeNonResponses: requested.includeNonResponses
	});

	// Le nom du fichier porte le croisement : trois exports dans un dossier de
	// telechargements doivent rester distinguables sans etre ouverts.
	const axes = [prepared.x.code, prepared.y?.code].filter(Boolean).join('-par-');
	const filename = `humanitour-${survey.slug}-${axes}.csv`;

	return new Response(resultToCsv(outcome), {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}"`,
			'Cache-Control': 'public, max-age=300'
		}
	});
};
