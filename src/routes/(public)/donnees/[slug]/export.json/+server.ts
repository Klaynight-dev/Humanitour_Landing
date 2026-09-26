import { error, json } from '@sveltejs/kit';
import { exportableQuestions, toJson } from '$lib/server/survey/export';
import { loadExportableResponses } from '$lib/server/survey/export-query';
import { getPublishedSurvey } from '$lib/server/survey/queries';
import { loadPublishedWeighting } from '$lib/server/survey/weighting-store';
import type { RequestHandler } from './$types';

/** Export brut au format JSON, methodologie et modalites comprises. */
export const GET: RequestHandler = async ({ params }) => {
	const survey = await getPublishedSurvey(params.slug);
	if (!survey) error(404, { message: "Cette enquete n'existe pas ou n'est pas publiee." });

	const questions = exportableQuestions(survey.questions);
	const [responses, weighting] = await Promise.all([
		loadExportableResponses(survey.id),
		loadPublishedWeighting(survey.id)
	]);

	// Des poids non publies, ou perimes, ne quittent jamais le serveur.
	const weighted = weighting?.fresh === true;

	return json(toJson(survey, responses, questions, { weighted }), {
		headers: {
			'Content-Disposition': `attachment; filename="humanitour-${survey.slug}.json"`,
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
