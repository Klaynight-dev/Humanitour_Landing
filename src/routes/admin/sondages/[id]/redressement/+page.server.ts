import { prisma } from '$lib/server/db';
import { DIMENSION_LABELS, detectDimension } from '$lib/server/insee/margins';
import { requirePermission } from '$lib/server/rbac/guard';
import { marginReport, readVariables } from '$lib/server/survey/weighting-plan';
import { calibrationQuestions, loadCalibrationData } from '$lib/server/survey/weighting-store';
import type { PageServerLoad } from './$types';

/**
 * Onglet 1 : l echantillon tel qu il a ete collecte.
 *
 * Aucune saisie ici. C est l ecran qui dit sur quoi on peut caler : les
 * questions a reponse unique, la variable du recensement a laquelle chacune
 * ressemble, et combien de repondants n y ont pas repondu.
 */
export const load: PageServerLoad = async ({ params, locals }) => {
	requirePermission(locals.user, 'survey.read');

	const [candidates, weighting] = await Promise.all([
		calibrationQuestions(params.id),
		prisma.surveyWeighting.findUnique({
			where: { surveyId: params.id },
			select: { variables: true }
		})
	]);
	const { units } = await loadCalibrationData(params.id, candidates);
	const selected = new Set(readVariables(weighting?.variables).map((variable) => variable.questionCode));

	return {
		respondents: units.length,
		questions: candidates.map((question) => {
			const report = marginReport(units, null, question.code, question.modalities, null);
			const classified = units.length - report.unknown;
			const dimension = detectDimension(question);

			return {
				code: question.code,
				label: question.label,
				dimension: dimension ? DIMENSION_LABELS[dimension] : null,
				selected: selected.has(question.code),
				missing: report.unknown,
				rows: report.rows.map((row) => ({
					key: row.key,
					label: row.label,
					share: row.observed,
					count: row.observed === null ? 0 : Math.round(row.observed * classified)
				}))
			};
		})
	};
};
