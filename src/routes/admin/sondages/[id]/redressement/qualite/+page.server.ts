import {
	histogramRows,
	impactOption,
	marginComparisonOption,
	weightHistogramOption
} from '$lib/charts/echarts/weighting-options';
import { renderedChart } from '$lib/server/charts';
import { prisma } from '$lib/server/db';
import { requirePermission } from '$lib/server/rbac/guard';
import { distribution } from '$lib/server/survey/aggregate';
import { getAnswerRows, resolveThreshold } from '$lib/server/survey/queries';
import { DESIGN_EFFECT_ALERT, kish, weightHistogram } from '$lib/server/survey/weighting';
import {
	marginReport,
	readDiagnostics,
	readUsedVariables,
	readVariables
} from '$lib/server/survey/weighting-plan';
import {
	calibrationQuestions,
	interestQuestions,
	loadCalibrationData
} from '$lib/server/survey/weighting-store';
import type { PageServerLoad } from './$types';

/**
 * Onglet 4 : ce que le redressement a coute, et ce qu il change.
 *
 * Les indicateurs de Kish sont recalcules sur les poids ECRITS en base, pas
 * relus dans le diagnostic : c est ce qui sera publie, et c est donc ce qu on
 * juge.
 */
export const load: PageServerLoad = async ({ params, locals, url }) => {
	requirePermission(locals.user, 'survey.read');

	const [survey, weighting, candidates, interests] = await Promise.all([
		prisma.survey.findUnique({
			where: { id: params.id },
			select: { kAnonymityThreshold: true }
		}),
		prisma.surveyWeighting.findUnique({ where: { surveyId: params.id } }),
		calibrationQuestions(params.id),
		interestQuestions(params.id)
	]);

	// Les marges du CALCUL, pas celles saisies depuis : on juge des poids avec
	// les cibles qui les ont produits.
	const variables = usedVariables(weighting);
	const used = candidates.filter((question) =>
		variables.some((variable) => variable.questionCode === question.code)
	);
	const { units, weights } = await loadCalibrationData(params.id, used);

	const diagnostics = readDiagnostics(weighting?.diagnostics);
	if (!weighting?.computedAt || weights.size === 0 || !diagnostics) return { quality: null };

	const values = [...weights.values()];
	const metrics = kish(values);
	const bins = weightHistogram(values);

	const margins = used.map((question) => {
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
			rows,
			chart: renderedChart(marginComparisonOption(rows))
		};
	});

	// La variable d interet : celle demandee, sinon la premiere qui ne sert pas au
	// calage. Comparer une variable de calage a elle-meme ne dirait que « la
	// cible est atteinte », deja lu plus haut.
	const calibrated = new Set(used.map((question) => question.code));
	const requested = url.searchParams.get('variable');
	const interest =
		interests.find((question) => question.code === requested) ??
		interests.find((question) => !calibrated.has(question.code)) ??
		interests[0] ??
		null;

	const impact = interest
		? await computeImpact(interest, weights, survey ?? { kAnonymityThreshold: null })
		: null;

	return {
		quality: {
			metrics: { ...metrics, respondents: values.length, atBounds: diagnostics.atBounds },
			alert: metrics.designEffect > DESIGN_EFFECT_ALERT,
			alertThreshold: DESIGN_EFFECT_ALERT,
			convergence: {
				converged: diagnostics.converged,
				iterations: diagnostics.iterations,
				maxDeviation: diagnostics.maxDeviation
			},
			settings: diagnostics.settings,
			warnings: diagnostics.warnings,
			histogram: {
				chart: renderedChart(weightHistogramOption(bins)),
				rows: histogramRows(bins, values.length)
			},
			margins,
			interests: interests.map((question) => ({
				code: question.code,
				label: question.label,
				calibrated: calibrated.has(question.code)
			})),
			impact
		}
	};
};

/**
 * Les marges avec lesquelles le dernier calcul a tourne, si elles ont ete
 * enregistrees, sinon les marges saisies : c est le meilleur qu on ait.
 */
function usedVariables(weighting: { diagnostics: unknown; variables: unknown } | null) {
	return readUsedVariables(weighting?.diagnostics) ?? readVariables(weighting?.variables);
}

/**
 * Ce que le redressement change a une question d interet : sa repartition
 * brute et redressee, cote a cote.
 *
 * Le seuil d anonymat s applique ici aussi : une capture de cet ecran finit
 * souvent dans un rapport, et une case sous le seuil n en sort pas.
 */
async function computeImpact(
	interest: Awaited<ReturnType<typeof interestQuestions>>[number],
	weights: ReadonlyMap<string, number>,
	survey: { kAnonymityThreshold: number | null }
) {
	const [answers, threshold] = await Promise.all([
		getAnswerRows(interest.id),
		resolveThreshold(survey)
	]);
	const result = distribution(answers, interest.modalities, { weights, threshold });
	const rows = result.bars.map((bar) => ({
		label: bar.label,
		raw: bar.share,
		weighted: bar.weightedShare,
		suppressed: bar.suppressed
	}));

	return {
		code: interest.code,
		label: interest.label,
		respondents: result.respondents,
		rows,
		chart: renderedChart(impactOption(rows.filter((row) => !row.suppressed)))
	};
}
