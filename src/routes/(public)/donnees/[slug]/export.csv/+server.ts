import { error } from '@sveltejs/kit';
import { exportableQuestions, toCsv } from '$lib/server/survey/export';
import { loadExportableResponses } from '$lib/server/survey/export-query';
import { getPublishedSurvey } from '$lib/server/survey/queries';
import type { RequestHandler } from './$types';

/** Export brut au format CSV. Contrat d URL stable : aucun compte requis. */
export const GET: RequestHandler = async ({ params }) => {
	const survey = await getPublishedSurvey(params.slug);
	if (!survey) error(404, { message: "Cette enquete n'existe pas ou n'est pas publiee." });

	const questions = exportableQuestions(survey.questions);
	const responses = await loadExportableResponses(survey.id);

	return new Response(toCsv(responses, questions), {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="humanitour-${survey.slug}.csv"`,
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
