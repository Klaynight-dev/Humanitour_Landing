import { getQuestionType, type ModalityDescriptor } from '$lib/shared/questions';
import { prisma } from '../db';
import { Prisma } from '../prisma-client/client';
import { rake, type WeightingDiagnostics } from './weighting';
import {
	buildUnits,
	canCalibrateOn,
	readDiagnostics,
	readVariables,
	toWeightingVariables,
	type CalibrationQuestion,
	type StoredVariable
} from './weighting-plan';

/**
 * Le redressement, cote base : lire les marges, ecrire les poids.
 *
 * Le poids de chaque repondant est ECRIT dans `Response.weight`, et non
 * recalcule a la volee : un chiffre redresse publie doit pouvoir etre refait a
 * l identique par quelqu un d autre, a partir du poids qu on lui donne.
 */

interface QuestionRow {
	readonly id: string;
	readonly code: string;
	readonly label: string;
	readonly type: string;
	readonly config: unknown;
	readonly options: readonly {
		code: string;
		label: string;
		position: number;
		isNonResponse: boolean;
		color: string | null;
	}[];
}

function modalitiesOf(question: QuestionRow): readonly ModalityDescriptor[] {
	const type = getQuestionType(question.type);
	if (!type) return [];
	return type.modalities({
		config: (question.config ?? {}) as Record<string, unknown>,
		options: [...question.options].sort((a, b) => a.position - b.position)
	});
}

/** Les questions d une enquete qui peuvent porter un calage, avec leurs modalites. */
export async function calibrationQuestions(
	surveyId: string
): Promise<(CalibrationQuestion & { id: string })[]> {
	const questions = await prisma.question.findMany({
		where: { surveyId },
		orderBy: { position: 'asc' },
		select: {
			id: true,
			code: true,
			label: true,
			type: true,
			config: true,
			isCrossable: true,
			options: {
				select: { code: true, label: true, position: true, isNonResponse: true, color: true }
			}
		}
	});

	return questions
		.filter((question) => question.isCrossable && canCalibrateOn(question.type))
		.map((question) => ({
			id: question.id,
			code: question.code,
			label: question.label,
			modalities: modalitiesOf(question)
		}))
		.filter((question) => question.modalities.some((modality) => !modality.isNonResponse));
}

/** Repondants et reponses aux questions de calage, en une passe. */
export async function loadCalibrationData(
	surveyId: string,
	questions: readonly { id: string; code: string }[]
) {
	const codeById = new Map(questions.map((question) => [question.id, question.code]));

	const [responses, answers] = await Promise.all([
		prisma.response.findMany({ where: { surveyId }, select: { id: true, weight: true } }),
		prisma.answer.findMany({
			where: { questionId: { in: [...codeById.keys()] } },
			select: { responseId: true, questionId: true, modalityKey: true }
		})
	]);

	const units = buildUnits(
		responses.map((response) => response.id),
		answers.map((answer) => ({
			responseId: answer.responseId,
			questionCode: codeById.get(answer.questionId) ?? '',
			modalityKey: answer.modalityKey
		}))
	);

	const weights = new Map(
		responses.flatMap((response) =>
			response.weight === null ? [] : [[response.id, response.weight] as const]
		)
	);

	return { units, weights };
}

export type ComputeResult =
	| { readonly ok: true; readonly version: number; readonly diagnostics: WeightingDiagnostics }
	| { readonly ok: false; readonly message: string };

/**
 * Lance le calage avec les marges enregistrees, et ecrit un poids par repondant.
 *
 * Les poids et le numero de version s ecrivent dans la meme transaction : un
 * lecteur ne peut pas voir les poids d une version sous le numero d une autre.
 */
export async function computeSurveyWeights(
	surveyId: string,
	actorId: string
): Promise<ComputeResult> {
	const weighting = await prisma.surveyWeighting.findUnique({ where: { surveyId } });
	if (!weighting) return { ok: false, message: 'Aucune marge enregistrée pour cette enquête.' };

	const stored = readVariables(weighting.variables);
	const variables = toWeightingVariables(stored);
	if (variables.length === 0) {
		return { ok: false, message: 'Aucune variable de calage exploitable.' };
	}

	const candidates = await calibrationQuestions(surveyId);
	const used = candidates.filter((question) =>
		variables.some((variable) => variable.questionCode === question.code)
	);

	const missing = variables.find(
		(variable) => !used.some((question) => question.code === variable.questionCode)
	);
	if (missing) {
		return {
			ok: false,
			message: `La question « ${missing.questionCode} » n'existe plus ou ne peut plus porter de calage.`
		};
	}

	const { units } = await loadCalibrationData(surveyId, used);
	if (units.length === 0) return { ok: false, message: 'Aucune réponse à redresser.' };

	const result = rake(units, variables, {
		minWeight: weighting.minWeight,
		maxWeight: weighting.maxWeight
	});

	const ids = [...result.weights.keys()];
	const values = ids.map((id) => result.weights.get(id) ?? 1);

	const [, updated] = await prisma.$transaction([
		prisma.$executeRaw`
			UPDATE "Response" AS r
			SET "weight" = v.w
			FROM unnest(${ids}::text[], ${values}::float8[]) AS v(id, w)
			WHERE r."id" = v.id
		`,
		prisma.surveyWeighting.update({
			where: { surveyId },
			data: {
				version: { increment: 1 },
				diagnostics: JSON.parse(JSON.stringify(result.diagnostics)),
				computedAt: new Date(),
				computedById: actorId
			}
		})
	]);

	return { ok: true, version: updated.version, diagnostics: result.diagnostics };
}

/** Retire le redressement : poids effaces, marges et historique conserves. */
export async function clearSurveyWeights(surveyId: string): Promise<void> {
	await prisma.$transaction([
		prisma.response.updateMany({ where: { surveyId }, data: { weight: null } }),
		prisma.surveyWeighting.update({
			where: { surveyId },
			data: { diagnostics: Prisma.DbNull, computedAt: null, isPublished: false, publishedAt: null }
		})
	]);
}

/**
 * Reponses arrivees depuis le dernier calcul.
 *
 * Elles n ont pas de poids. Les compter a 1 melangerait deux populations, celle
 * qui a ete calee et celle qui ne l a pas ete : tant qu il en reste, la lecture
 * redressee n est plus proposee au public, et le back-office demande un
 * nouveau calcul.
 */
export async function countUnweighted(surveyId: string): Promise<number> {
	return prisma.response.count({ where: { surveyId, weight: null } });
}

/** Ce que le public apprend d un redressement : tout ce qui a servi a le faire. */
export interface PublicWeighting {
	readonly version: number;
	readonly computedAt: Date;
	readonly source: string | null;
	readonly variables: readonly StoredVariable[];
	readonly diagnostics: WeightingDiagnostics | null;
	/** Faux quand des reponses sont arrivees depuis le calcul. */
	readonly fresh: boolean;
}

/** Le redressement publie d une enquete, ou `null` s il n y en a pas. */
export async function loadPublishedWeighting(surveyId: string): Promise<PublicWeighting | null> {
	const weighting = await prisma.surveyWeighting.findFirst({
		where: { surveyId, isPublished: true, computedAt: { not: null } }
	});
	if (!weighting?.computedAt) return null;

	const unweighted = await countUnweighted(surveyId);

	return {
		version: weighting.version,
		computedAt: weighting.computedAt,
		source: weighting.source,
		variables: readVariables(weighting.variables),
		diagnostics: readDiagnostics(weighting.diagnostics),
		fresh: unweighted === 0
	};
}

/** Poids de tous les repondants d une enquete. */
export async function loadWeights(surveyId: string): Promise<Map<string, number>> {
	const responses = await prisma.response.findMany({
		where: { surveyId, weight: { not: null } },
		select: { id: true, weight: true }
	});

	return new Map(responses.map((response) => [response.id, response.weight ?? 1]));
}
