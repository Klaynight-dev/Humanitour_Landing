import { error, json } from '@sveltejs/kit';
import { exportableQuestions, toJson } from '$lib/server/survey/export';
import { loadExportableResponses } from '$lib/server/survey/export-query';
import { getPublishedSurvey } from '$lib/server/survey/queries';
import type { RequestHandler } from './$types';

/** Export brut au format JSON, methodologie et modalites comprises. */
export const GET: RequestHandler = async ({ params }) => {
	const survey = await getPublishedSurvey(params.slug);
	if (!survey) error(404, { message: "Cette enquete n'existe pas ou n'est pas publiee." });

	const questions = exportableQuestions(survey.questions);
	const responses = await loadExportableResponses(survey.id);

	return json(toJson(survey, responses, questions), {
		headers: {
			'Content-Disposition': `attachment; filename="humanitour-${survey.slug}.json"`,
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
