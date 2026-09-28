import { fail } from '@sveltejs/kit';
import { recordAudit } from '$lib/server/audit';
import { prisma } from '$lib/server/db';
import { readOptionalText } from '$lib/server/forms';
import { loadCensusReference } from '$lib/server/insee/census';
import {
	DIMENSION_LABELS,
	censusOrigin,
	censusSource,
	detectDimension,
	proposeMargins
} from '$lib/server/insee/margins';
import { MelodiError } from '$lib/server/insee/melodi';
import { requirePermission } from '$lib/server/rbac/guard';
import {
	marginReport,
	parseTargetsForm,
	readDiagnostics,
	readUsedVariables,
	readVariables,
	roundPercentages,
	sameMargins
} from '$lib/server/survey/weighting-plan';
import { calibrationQuestions, loadCalibrationData } from '$lib/server/survey/weighting-store';
import type { Actions, PageServerLoad } from './$types';

/**
 * Onglet 2 : les marges cibles.
 *
 * Les parts de population viennent de l Insee (API Melodi, recensement de la
 * population) ou sont saisies a la main pour un public cible particulier. Dans
 * les deux cas, rien ne s enregistre sans que l analyste l ait relu, et la
 * somme de chaque variable doit faire exactement 100 %.
 */
export const load: PageServerLoad = async ({ params, locals }) => {
	requirePermission(locals.user, 'survey.read');

	const [candidates, weighting] = await Promise.all([
		calibrationQuestions(params.id),
		prisma.surveyWeighting.findUnique({ where: { surveyId: params.id } })
	]);
	const { units, weights } = await loadCalibrationData(params.id, candidates);

	const variables = readVariables(weighting?.variables);
	const computed = weighting?.computedAt ? weights : null;

	return {
		questions: candidates.map((question) => {
			const stored = variables.find((variable) => variable.questionCode === question.code);
			const report = marginReport(
				units,
				stored ? computed : null,
				question.code,
				question.modalities,
				stored?.targets ?? null
			);
			const dimension = detectDimension(question);

			return {
				code: question.code,
				label: question.label,
				dimension: dimension ? DIMENSION_LABELS[dimension] : null,
				selected: stored !== undefined,
				rows: report.rows,
				unknown: report.unknown,
				origin: stored?.origin ?? null,
				// Reposte tel quel a l enregistrement suivant : une marge de l Insee
				// reste une marge de l Insee tant qu on ne la retouche pas.
				originJson: stored?.origin
					? JSON.stringify({ ...stored.origin, edited: undefined })
					: ''
			};
		})
	};
};

export const actions: Actions = {
	/**
	 * Interroge l Insee et PROPOSE des marges, sans rien enregistrer.
	 *
	 * La proposition revient dans le formulaire ; c est l enregistrement, apres
	 * relecture, qui l ecrit en base.
	 */
	census: async ({ params, locals }) => {
		requirePermission(locals.user, 'survey.weight');

		let reference;
		try {
			reference = await loadCensusReference();
		} catch (cause) {
			if (cause instanceof MelodiError) {
				return fail(502, {
					message: `${cause.message} Vous pouvez saisir les marges à la main en attendant.`
				});
			}
			throw cause;
		}

		const candidates = await calibrationQuestions(params.id);
		const proposals = candidates.flatMap((question) => {
			const proposal = proposeMargins(question, reference);
			if (!proposal) return [];

			const matched = proposal.modalities.filter((modality) => modality.share !== null);
			const percents = roundPercentages(matched.map((modality) => modality.share ?? 0));
			const values = Object.fromEntries(
				matched.map((modality, index) => [modality.key, percents[index]!])
			);
			const censusTargets = Object.fromEntries(
				Object.entries(values).map(([key, percent]) => [key, percent / 100])
			);

			return [
				{
					questionCode: question.code,
					dimension: DIMENSION_LABELS[proposal.dimension],
					values,
					modalities: proposal.modalities.map((modality) => ({
						key: modality.key,
						census: modality.census,
						reason: modality.reason
					})),
					notes: proposal.notes,
					origin: JSON.stringify({ ...censusOrigin(reference, proposal.dimension), censusTargets })
				}
			];
		});

		if (proposals.length === 0) {
			return fail(422, {
				message:
					"Aucune question de cette enquête ne ressemble à une variable du recensement (sexe, âge, PCS, région). Saisissez les marges à la main."
			});
		}

		return {
			message: `Marges du recensement ${reference.period} proposées pour ${proposals.length} question${proposals.length > 1 ? 's' : ''}. Relisez-les, puis enregistrez : rien n'est écrit avant.`,
			census: { source: censusSource(reference), period: reference.period, proposals }
		};
	},

	save: async ({ request, params, locals }) => {
		const user = requirePermission(locals.user, 'survey.weight');
		const form = await request.formData();

		const candidates = await calibrationQuestions(params.id);
		const parsed = parseTargetsForm(form, candidates);
		if (!parsed.ok) return fail(400, { message: parsed.message });

		const source = readOptionalText(form, 'source');
		const existing = await prisma.surveyWeighting.findUnique({ where: { surveyId: params.id } });

		// Des poids publies qui ne correspondent plus aux marges affichees seraient
		// un redressement qui ne dit pas ce qu il a fait : on retire la
		// publication, et on le dit.
		const used =
			readUsedVariables(existing?.diagnostics) ?? readVariables(existing?.variables);
		const withdraw = !!existing?.isPublished && !sameMargins(used, parsed.variables);

		// Aller-retour JSON : la colonne attend une valeur JSON, pas une interface.
		const variables = JSON.parse(JSON.stringify(parsed.variables));
		await prisma.surveyWeighting.upsert({
			where: { surveyId: params.id },
			create: { surveyId: params.id, variables, source },
			update: withdraw
				? { variables, source, isPublished: false, publishedAt: null }
				: { variables, source }
		});

		await recordAudit({
			actorId: user.id,
			action: 'survey.weight.margins',
			entity: 'Survey',
			entityId: params.id,
			metadata: { source, variables, withdrawn: withdraw }
		});

		const computed = readDiagnostics(existing?.diagnostics) !== null;
		return {
			message: withdraw
				? 'Marges enregistrées. La lecture redressée a été retirée du site public : ses poids avaient été calculés sur les anciennes marges. Relancez le calcul.'
				: computed && !sameMargins(used, parsed.variables)
					? 'Marges enregistrées. Relancez le calcul pour que les poids en tiennent compte.'
					: 'Marges enregistrées.'
		};
	}
};
