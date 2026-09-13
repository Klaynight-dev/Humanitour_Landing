import {
	getQuestionType,
	type ModalityDescriptor,
	type QuestionOptionLike
} from '$lib/shared/questions';
import { prisma } from '../db';
import { pickThreshold } from './anonymity';
import type { AnswerRow } from './aggregate';

/**
 * Acces en lecture aux sondages publies.
 *
 * Tout ce qui sort d ici est destine au public : aucune fonction de ce fichier ne
 * doit exposer un sondage en brouillon.
 */

export interface PublicQuestion {
	readonly id: string;
	readonly code: string;
	readonly label: string;
	readonly type: string;
	readonly config: Readonly<Record<string, unknown>>;
	readonly options: readonly QuestionOptionLike[];
	readonly isCrossable: boolean;
}

export interface PublicSurvey {
	readonly id: string;
	readonly slug: string;
	readonly title: string;
	readonly subtitle: string | null;
	readonly description: string | null;
	readonly methodology: string | null;
	readonly fieldworkStart: Date | null;
	readonly fieldworkEnd: Date | null;
	readonly publishedAt: Date | null;
	readonly kAnonymityThreshold: number | null;
	readonly questions: readonly PublicQuestion[];
	readonly responseCount: number;
}

export async function listPublishedSurveys() {
	const surveys = await prisma.survey.findMany({
		where: { status: 'PUBLISHED' },
		orderBy: { publishedAt: 'desc' },
		select: {
			slug: true,
			title: true,
			subtitle: true,
			publishedAt: true,
			fieldworkStart: true,
			fieldworkEnd: true,
			_count: { select: { responses: true, questions: true } }
		}
	});

	return surveys.map((survey) => ({
		slug: survey.slug,
		title: survey.title,
		subtitle: survey.subtitle,
		publishedAt: survey.publishedAt,
		fieldworkStart: survey.fieldworkStart,
		fieldworkEnd: survey.fieldworkEnd,
		responseCount: survey._count.responses,
		questionCount: survey._count.questions
	}));
}

export async function getPublishedSurvey(slug: string): Promise<PublicSurvey | null> {
	const survey = await prisma.survey.findFirst({
		where: { slug, status: 'PUBLISHED' },
		include: {
			questions: { orderBy: { position: 'asc' }, include: { options: true } },
			_count: { select: { responses: true } }
		}
	});

	if (!survey) return null;

	return {
		id: survey.id,
		slug: survey.slug,
		title: survey.title,
		subtitle: survey.subtitle,
		description: survey.description,
		methodology: survey.methodology,
		fieldworkStart: survey.fieldworkStart,
		fieldworkEnd: survey.fieldworkEnd,
		publishedAt: survey.publishedAt,
		kAnonymityThreshold: survey.kAnonymityThreshold,
		responseCount: survey._count.responses,
		questions: survey.questions.map((question) => ({
			id: question.id,
			code: question.code,
			label: question.label,
			type: question.type,
			config: (question.config ?? {}) as Record<string, unknown>,
			isCrossable: question.isCrossable,
			options: question.options
				.slice()
				.sort((a, b) => a.position - b.position)
				.map((option) => ({
					code: option.code,
					label: option.label,
					position: option.position,
					isNonResponse: option.isNonResponse,
					color: option.color
				}))
		}))
	};
}

/**
 * Modalites attendues d une question, dans leur ordre d affichage.
 *
 * Delegue au registre : la page ne sait pas ce qu est une echelle ou une tranche.
 * Un type retire du registre rend une liste vide, et l agregation se rabat sur
 * les modalites observees dans les donnees.
 */
export function questionModalities(question: PublicQuestion): readonly ModalityDescriptor[] {
	const type = getQuestionType(question.type);
	if (!type) return [];
	return type.modalities({ config: question.config, options: question.options });
}

/** Questions proposables comme axe de croisement. */
export function crossableQuestions(survey: PublicSurvey): readonly PublicQuestion[] {
	return survey.questions.filter((question) => {
		if (!question.isCrossable) return false;
		return getQuestionType(question.type)?.crossable ?? false;
	});
}

export function findQuestion(survey: PublicSurvey, code: string | null): PublicQuestion | null {
	if (!code) return null;
	return survey.questions.find((question) => question.code === code) ?? null;
}

/** Reponses d une question, reduites a ce dont l agregation a besoin. */
export async function getAnswerRows(questionId: string): Promise<AnswerRow[]> {
	const answers = await prisma.answer.findMany({
		where: { questionId },
		select: { responseId: true, modalityKey: true }
	});

	return answers;
}

/**
 * Seuil de k-anonymat applicable.
 *
 * Ordre : surcharge du sondage, puis reglage global, puis defaut. Resolu ici et
 * nulle part ailleurs, pour qu un chemin d acces ne puisse pas publier avec un
 * seuil plus permissif qu un autre.
 */
export async function resolveThreshold(survey: {
	kAnonymityThreshold: number | null;
}): Promise<number> {
	const setting = await prisma.appSetting.findUnique({ where: { key: 'anonymity.k' } });
	return pickThreshold(survey.kAnonymityThreshold, setting?.value);
}
