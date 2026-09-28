import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { requirePermission } from '$lib/server/rbac/guard';
import { weightsCsv } from '$lib/server/survey/export';
import { readUsedVariables, readVariables } from '$lib/server/survey/weighting-plan';
import { calibrationQuestions, loadCalibrationData } from '$lib/server/survey/weighting-store';
import type { RequestHandler } from './$types';

/**
 * Les poids du dernier calcul, un repondant par ligne.
 *
 * Reserve a l equipe : il sort aussi des poids non publies. Jamais mis en
 * cache, pour qu un telechargement suive toujours le dernier calcul.
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	requirePermission(locals.user, 'survey.read');

	const [survey, weighting, candidates] = await Promise.all([
		prisma.survey.findUnique({ where: { id: params.id }, select: { slug: true } }),
		prisma.surveyWeighting.findUnique({ where: { surveyId: params.id } }),
		calibrationQuestions(params.id)
	]);
	if (!survey) error(404, { message: 'Sondage introuvable.' });
	if (!weighting?.computedAt) error(404, { message: 'Aucun poids calculé pour ce sondage.' });

	const variables =
		readUsedVariables(weighting.diagnostics) ?? readVariables(weighting.variables);
	const used = candidates.filter((question) =>
		variables.some((variable) => variable.questionCode === question.code)
	);
	const { units, weights } = await loadCalibrationData(params.id, used);

	const csv = weightsCsv(
		units,
		weights,
		used.map((question) => question.code)
	);

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="redressement-${survey.slug}-v${weighting.version}.csv"`,
			'Cache-Control': 'no-store'
		}
	});
};
