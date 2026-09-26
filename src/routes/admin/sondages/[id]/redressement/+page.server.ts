import { error, fail } from '@sveltejs/kit';
import { recordAudit } from '$lib/server/audit';
import { prisma } from '$lib/server/db';
import { readOptionalText } from '$lib/server/forms';
import { requirePermission } from '$lib/server/rbac/guard';
import {
	marginReport,
	parseTargetsForm,
	readDiagnostics,
	readVariables
} from '$lib/server/survey/weighting-plan';
import {
	calibrationQuestions,
	clearSurveyWeights,
	computeSurveyWeights,
	countUnweighted,
	loadCalibrationData
} from '$lib/server/survey/weighting-store';
import { DEFAULT_MAX_WEIGHT, DEFAULT_MIN_WEIGHT } from '$lib/server/survey/weighting';
import type { Actions, PageServerLoad } from './$types';

/**
 * Redressement d une enquete, cote analyste.
 *
 * Tout ce qui fera un chiffre redresse se decide ici, a la main : les
 * variables, les marges cibles et leur source, les bornes des poids. Rien ne se
 * devine, et rien ne part en public sans un geste de publication distinct du
 * calcul.
 */

export const load: PageServerLoad = async ({ params, locals }) => {
	requirePermission(locals.user, 'survey.read');

	const survey = await prisma.survey.findUnique({
		where: { id: params.id },
		select: {
			id: true,
			slug: true,
			title: true,
			status: true,
			_count: { select: { responses: true } },
			weighting: { include: { computedBy: { select: { displayName: true } } } }
		}
	});
	if (!survey) error(404, { message: 'Sondage introuvable.' });

	const candidates = await calibrationQuestions(survey.id);
	const [{ units, weights }, unweighted] = await Promise.all([
		loadCalibrationData(survey.id, candidates),
		countUnweighted(survey.id)
	]);

	const weighting = survey.weighting;
	const variables = readVariables(weighting?.variables);
	const computed = weighting?.computedAt ? weights : null;

	return {
		survey: {
			id: survey.id,
			slug: survey.slug,
			title: survey.title,
			status: survey.status,
			responseCount: survey._count.responses
		},
		settings: {
			source: weighting?.source ?? '',
			minWeight: weighting?.minWeight ?? DEFAULT_MIN_WEIGHT,
			maxWeight: weighting?.maxWeight ?? DEFAULT_MAX_WEIGHT
		},
		state: describeLatest(weighting, unweighted),
		// Toutes les questions candidates, retenues ou non : la marge observee
		// d une question non retenue est souvent ce qui decide de la retenir.
		questions: candidates.map((question) => {
			const stored = variables.find((variable) => variable.questionCode === question.code);
			const report = marginReport(
				units,
				stored ? computed : null,
				question.code,
				question.modalities,
				stored?.targets ?? null
			);

			return {
				code: question.code,
				label: question.label,
				selected: stored !== undefined,
				rows: report.rows,
				unknown: report.unknown
			};
		})
	};
};

/** Le dernier calcul, ou `null` s il n y en a pas. */
function describeLatest(
	weighting: {
		version: number;
		computedAt: Date | null;
		computedBy: { displayName: string } | null;
		isPublished: boolean;
		publishedAt: Date | null;
		diagnostics: unknown;
	} | null,
	unweighted: number
) {
	if (!weighting?.computedAt) return null;

	return {
		version: weighting.version,
		computedAt: weighting.computedAt,
		computedBy: weighting.computedBy?.displayName ?? null,
		isPublished: weighting.isPublished,
		publishedAt: weighting.publishedAt,
		diagnostics: readDiagnostics(weighting.diagnostics),
		unweighted
	};
}

/** Borne d un poids : un nombre, dans l intervalle attendu. */
function readBound(form: FormData, name: string, min: number, max: number): number | null {
	const raw = String(form.get(name) ?? '')
		.replace(',', '.')
		.trim();
	const value = Number(raw);
	if (raw === '' || !Number.isFinite(value) || value < min || value > max) return null;
	return value;
}

export const actions: Actions = {
	/** Enregistre les marges et lance le calcul dans la foulee. */
	save: async ({ request, params, locals }) => {
		const user = requirePermission(locals.user, 'survey.weight');
		const form = await request.formData();

		const candidates = await calibrationQuestions(params.id);
		const parsed = parseTargetsForm(form, candidates);
		if (!parsed.ok) return fail(400, { message: parsed.message });

		const minWeight = readBound(form, 'minWeight', 0.01, 1);
		const maxWeight = readBound(form, 'maxWeight', 1, 50);
		if (minWeight === null || maxWeight === null) {
			return fail(400, {
				message:
					'Bornes des poids : le plancher doit être entre 0,01 et 1, le plafond entre 1 et 50.'
			});
		}

		const source = readOptionalText(form, 'source');
		// Aller-retour JSON : la colonne attend une valeur JSON, pas une interface.
		const variables = JSON.parse(JSON.stringify(parsed.variables));
		const data = { variables, source, minWeight, maxWeight };

		await prisma.surveyWeighting.upsert({
			where: { surveyId: params.id },
			create: { surveyId: params.id, ...data },
			update: data
		});

		return compute(params.id, user.id);
	},

	/** Relance le calcul avec les marges enregistrees, apres l arrivee de reponses. */
	recompute: async ({ params, locals }) => {
		const user = requirePermission(locals.user, 'survey.weight');
		return compute(params.id, user.id);
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
				message:
					'Des réponses sont arrivées depuis le dernier calcul : relancez-le avant de publier.'
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

async function compute(surveyId: string, actorId: string) {
	const result = await computeSurveyWeights(surveyId, actorId);
	if (!result.ok) return fail(400, { message: result.message });

	const weighting = await prisma.surveyWeighting.findUnique({ where: { surveyId } });

	// Le journal garde les marges ET le diagnostic de chaque version : c est
	// l historique qui permet de dire, dans deux ans, sur quoi reposait un
	// chiffre redresse publie aujourd hui.
	await recordAudit({
		actorId,
		action: 'survey.weight.compute',
		entity: 'Survey',
		entityId: surveyId,
		metadata: {
			version: result.version,
			source: weighting?.source ?? null,
			minWeight: weighting?.minWeight ?? null,
			maxWeight: weighting?.maxWeight ?? null,
			variables: readVariables(weighting?.variables),
			diagnostics: JSON.parse(JSON.stringify(result.diagnostics))
		}
	});

	const { converged, effectiveSampleSize, respondents } = result.diagnostics;
	const effective = Math.round(effectiveSampleSize).toLocaleString('fr-FR');

	return {
		message: converged
			? `Version ${result.version} calculée : le calage a convergé. Taille effective ${effective} sur ${respondents.toLocaleString('fr-FR')} répondants.`
			: `Version ${result.version} calculée, SANS convergence : certaines marges restent loin de leur cible. Lisez le diagnostic avant de publier.`
	};
}
