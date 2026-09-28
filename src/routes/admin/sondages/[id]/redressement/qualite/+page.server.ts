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
	const variables =
		readUsedVariables(weighting?.diagnostics) ?? readVariables(weighting?.variables);
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

	let impact = null;
	if (interest) {
		const [answers, threshold] = await Promise.all([
			getAnswerRows(interest.id),
			// L enquete introuvable est deja un 404 du gabarit ; ici, le seuil par defaut.
			resolveThreshold(survey ?? { kAnonymityThreshold: null })
		]);
		// Seuil d anonymat applique ici aussi : une capture de cet ecran finit
		// souvent dans un rapport, et une case sous le seuil n en sort pas.
		const result = distribution(answers, interest.modalities, { weights, threshold });
		const rows = result.bars.map((bar) => ({
			label: bar.label,
			raw: bar.share,
			weighted: bar.weightedShare,
			suppressed: bar.suppressed
		}));

		impact = {
			code: interest.code,
			label: interest.label,
			respondents: result.respondents,
			rows,
			chart: renderedChart(impactOption(rows.filter((row) => !row.suppressed)))
		};
	}

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
