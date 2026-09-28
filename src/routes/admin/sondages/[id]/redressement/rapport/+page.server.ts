import { CENSUS_DATASETS } from '$lib/server/insee/census';
import { prisma } from '$lib/server/db';
import { requirePermission } from '$lib/server/rbac/guard';
import { DESIGN_EFFECT_ALERT, kish } from '$lib/server/survey/weighting';
import {
	checkIntegrity,
	marginReport,
	readDiagnostics,
	readUsedVariables,
	readVariables
} from '$lib/server/survey/weighting-plan';
import { calibrationQuestions, loadCalibrationData } from '$lib/server/survey/weighting-store';
import type { PageServerLoad } from './$types';

/**
 * Onglet 5 : la note methodologique et l export des poids.
 *
 * La note se compose a partir de ce qui a REELLEMENT servi : les marges et les
 * parametres enregistres avec le dernier calcul, les poids ecrits en base. Elle
 * ne decrit pas ce qu on aurait voulu faire.
 */
export const load: PageServerLoad = async ({ params, locals }) => {
	requirePermission(locals.user, 'survey.read');

	const [survey, weighting, candidates] = await Promise.all([
		prisma.survey.findUnique({
			where: { id: params.id },
			select: { fieldworkStart: true, fieldworkEnd: true }
		}),
		prisma.surveyWeighting.findUnique({ where: { surveyId: params.id } }),
		calibrationQuestions(params.id)
	]);

	const diagnostics = readDiagnostics(weighting?.diagnostics);
	if (!weighting?.computedAt || !diagnostics) return { note: null };

	const variables =
		readUsedVariables(weighting.diagnostics) ?? readVariables(weighting.variables);
	const used = candidates.filter((question) =>
		variables.some((variable) => variable.questionCode === question.code)
	);
	const { units, weights } = await loadCalibrationData(params.id, used);
	const integrity = checkIntegrity(units, variables, used);
	const metrics = kish([...weights.values()]);

	return {
		note: {
			version: weighting.version,
			computedAt: weighting.computedAt,
			fieldworkStart: survey?.fieldworkStart ?? null,
			fieldworkEnd: survey?.fieldworkEnd ?? null,
			source: weighting.source,
			respondents: weights.size,
			settings: diagnostics.settings,
			convergence: {
				converged: diagnostics.converged,
				iterations: diagnostics.iterations,
				maxDeviation: diagnostics.maxDeviation
			},
			metrics: { ...metrics, atBounds: diagnostics.atBounds },
			alert: metrics.designEffect > DESIGN_EFFECT_ALERT,
			alertThreshold: DESIGN_EFFECT_ALERT,
			usesPcs: variables.some((variable) => variable.origin?.dimension === 'pcs'),
			pcsTable: CENSUS_DATASETS.pcs.table,
			variables: used.map((question) => {
				const variable = variables.find((candidate) => candidate.questionCode === question.code);
				const { rows } = marginReport(
					units,
					weights,
					question.code,
					question.modalities,
					variable?.targets ?? null
				);
				return {
					code: question.code,
					label: question.label,
					origin: variable?.origin ?? null,
					missing: integrity.find((report) => report.questionCode === question.code)?.missing ?? 0,
					rows
				};
			})
		}
	};
};
