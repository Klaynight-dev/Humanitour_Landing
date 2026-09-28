import { fail } from '@sveltejs/kit';
import { convergenceOption } from '$lib/charts/echarts/weighting-options';
import { recordAudit } from '$lib/server/audit';
import { renderedChart } from '$lib/server/charts';
import { prisma } from '$lib/server/db';
import { requirePermission } from '$lib/server/rbac/guard';
import { DESIGN_EFFECT_ALERT } from '$lib/server/survey/weighting';
import {
	checkIntegrity,
	currentSettings,
	parseSettingsForm,
	readDiagnostics,
	readUsedVariables,
	readVariables,
	sameMargins
} from '$lib/server/survey/weighting-plan';
import {
	calibrationQuestions,
	clearSurveyWeights,
	computeSurveyWeights,
	countUnweighted,
	loadCalibrationData
} from '$lib/server/survey/weighting-store';
import { formatCount, formatDecimal } from '$lib/shared/format';
import type { Actions, PageServerLoad } from './$types';

/**
 * Onglet 3 : le calcul, puis la publication.
 *
 * Calculer n est pas publier. Le calcul ecrit un poids par repondant et un
 * diagnostic ; la publication, geste distinct, propose la lecture redressee au
 * public, a cote de la brute.
 */
export const load: PageServerLoad = async ({ params, locals }) => {
	requirePermission(locals.user, 'survey.read');

	const [candidates, weighting] = await Promise.all([
		calibrationQuestions(params.id),
		prisma.surveyWeighting.findUnique({ where: { surveyId: params.id } })
	]);

	const variables = readVariables(weighting?.variables);
	const used = candidates.filter((question) =>
		variables.some((variable) => variable.questionCode === question.code)
	);
	const { units } = await loadCalibrationData(params.id, used);

	const diagnostics = readDiagnostics(weighting?.diagnostics);
	const history = diagnostics?.history ?? [];

	return {
		variableCount: variables.length,
		settings: currentSettings(diagnostics, weighting),
		integrity: checkIntegrity(units, variables, used),
		respondents: units.length,
		convergence:
			history.length > 0 && diagnostics?.settings
				? renderedChart(convergenceOption(history, diagnostics.settings.tolerance))
				: null,
		history
	};
};

export const actions: Actions = {
	compute: async ({ request, params, locals }) => {
		const user = requirePermission(locals.user, 'survey.weight');
		const parsed = parseSettingsForm(await request.formData());
		if (!parsed.ok) return fail(400, { message: parsed.message });

		const result = await computeSurveyWeights(params.id, user.id, parsed);
		if (!result.ok) return fail(400, { message: result.message });

		const weighting = await prisma.surveyWeighting.findUnique({ where: { surveyId: params.id } });

		// Le journal garde les marges ET le diagnostic de chaque version : c est
		// l historique qui permet de dire, dans deux ans, sur quoi reposait un
		// chiffre redresse publie aujourd hui.
		await recordAudit({
			actorId: user.id,
			action: 'survey.weight.compute',
			entity: 'Survey',
			entityId: params.id,
			metadata: {
				version: result.version,
				source: weighting?.source ?? null,
				settings: parsed.settings,
				missingAcknowledged: parsed.missingAcknowledged,
				variables: readVariables(weighting?.variables),
				diagnostics: JSON.parse(JSON.stringify({ ...result.diagnostics, history: undefined }))
			}
		});

		const { converged, effectiveSampleSize, respondents, designEffect, iterations } =
			result.diagnostics;
		const kish = `n effectif ${formatCount(Math.round(effectiveSampleSize))} sur ${formatCount(respondents)}, effet de plan ${formatDecimal(designEffect, 2)}`;
		const alert =
			designEffect > DESIGN_EFFECT_ALERT
				? ` L'effet de plan dépasse ${formatDecimal(DESIGN_EFFECT_ALERT, 1)} : lisez l'onglet Qualité avant de publier.`
				: '';

		return {
			message: converged
				? `Version ${result.version} calculée : convergence en ${iterations} itération${iterations > 1 ? 's' : ''}, ${kish}.${alert}`
				: `Version ${result.version} calculée, SANS convergence après ${iterations} itérations : des marges restent loin de leur cible (${kish}).${alert}`
		};
	},

	publish: async ({ params, locals }) => {
		const user = requirePermission(locals.user, 'survey.weight');

		const weighting = await prisma.surveyWeighting.findUnique({ where: { surveyId: params.id } });
		if (!weighting?.computedAt) {
			return fail(400, { message: 'Lancez un calcul avant de publier le redressement.' });
		}

		// Publier des poids perimes montrerait au public un redressement qui ne
		// porte pas sur toutes les reponses affichees en brut.
		if ((await countUnweighted(params.id)) > 0) {
			return fail(400, {
				message: 'Des réponses sont arrivées depuis le dernier calcul : relancez-le avant de publier.'
			});
		}

		const used = readUsedVariables(weighting.diagnostics);
		if (used && !sameMargins(used, readVariables(weighting.variables))) {
			return fail(400, {
				message:
					'Les marges ont changé depuis le dernier calcul : relancez-le avant de publier, sinon le public lirait des poids qui ne correspondent pas aux marges affichées.'
			});
		}

		await prisma.surveyWeighting.update({
			where: { surveyId: params.id },
			data: { isPublished: true, publishedAt: new Date() }
		});
		await recordAudit({
			actorId: user.id,
			action: 'survey.weight.publish',
			entity: 'Survey',
			entityId: params.id,
			metadata: { version: weighting.version }
		});

		return { message: 'Lecture redressée proposée au public, à côté de la lecture brute.' };
	},

	unpublish: async ({ params, locals }) => {
		const user = requirePermission(locals.user, 'survey.weight');

		await prisma.surveyWeighting.update({
			where: { surveyId: params.id },
			data: { isPublished: false, publishedAt: null }
		});
		await recordAudit({
			actorId: user.id,
			action: 'survey.weight.unpublish',
			entity: 'Survey',
			entityId: params.id
		});

		return { message: 'Lecture redressée retirée du site public.' };
	},

	clear: async ({ params, locals }) => {
		const user = requirePermission(locals.user, 'survey.weight');

		const weighting = await prisma.surveyWeighting.findUnique({ where: { surveyId: params.id } });
		if (!weighting) return fail(404, { message: 'Aucun redressement à retirer.' });

		await clearSurveyWeights(params.id);
		await recordAudit({
			actorId: user.id,
			action: 'survey.weight.clear',
			entity: 'Survey',
			entityId: params.id,
			metadata: { version: weighting.version }
		});

		return { message: 'Poids effacés. Les marges saisies sont conservées.' };
	}
};
