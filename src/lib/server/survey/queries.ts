import {
	getQuestionType,
	type ModalityDescriptor,
	type QuestionOptionLike
} from '$lib/shared/questions';
import type { ExploreParams, FilterClause } from '$shared/explore';
import { prisma } from '../db';
import { pickThreshold } from './anonymity';
import type { AnswerRow } from './aggregate';
import { selectAxes, type Axis } from './explore';
import {
	everyone,
	matchClauses,
	restrictTo,
	type DroppedClause,
	type Population
} from './population';

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

/**
 * Repondants ayant retenu au moins une des modalites demandees.
 *
 * C est le OU d une clause de filtre : cocher « Bretagne » et « Normandie »
 * dans la meme liste elargit la population, cocher dans deux listes la
 * restreint (l intersection est faite par `population.ts`).
 */
export async function getRespondents(
	questionId: string,
	modalityKeys: readonly string[]
): Promise<Set<string>> {
	const rows = await prisma.answer.findMany({
		where: { questionId, modalityKey: { in: [...modalityKeys] } },
		select: { responseId: true },
		distinct: ['responseId']
	});

	return new Set(rows.map((row) => row.responseId));
}

/**
 * Population etudiee pour un jeu de filtres d URL.
 *
 * Les clauses inapplicables ressortent telles quelles : elles sont affichees au
 * visiteur, jamais avalees en silence (voir `population.ts`).
 */
export async function resolvePopulation(
	survey: PublicSurvey,
	filters: readonly FilterClause[]
): Promise<{ population: Population; dropped: readonly DroppedClause[] }> {
	const { applied, dropped } = matchClauses(crossableQuestions(survey), filters);

	if (applied.length === 0) {
		return { population: everyone(survey.responseCount), dropped };
	}

	const sets = await Promise.all(
		applied.map((clause) => getRespondents(clause.questionId, clause.modalityKeys))
	);

	return { population: restrictTo(survey.responseCount, sets), dropped };
}

/** Un axe de l explorateur : ses modalites declarees et ses reponses. */
export async function loadAxis(question: PublicQuestion): Promise<Axis> {
	return {
		code: question.code,
		label: question.label,
		modalities: questionModalities(question),
		rows: await getAnswerRows(question.id)
	};
}

/** Tout ce qu il faut pour calculer un resultat d explorateur, lu en une passe. */
export interface PreparedExplore {
	readonly xQuestion: PublicQuestion;
	readonly yQuestion: PublicQuestion | null;
	readonly x: Axis;
	readonly y: Axis | null;
	/** Question de decoupage en petits multiples. */
	readonly z: Axis | null;
	readonly population: Population;
	readonly dropped: readonly DroppedClause[];
	readonly threshold: number;
}

/**
 * Prepare un resultat d explorateur.
 *
 * Point de passage UNIQUE de la page publique et de l API publique. Deux
 * chargements separes finiraient par lire des seuils differents ou oublier un
 * filtre d un cote : le meme croisement rendrait alors deux chiffres selon
 * l adresse par laquelle on le demande.
 *
 * Rend `null` quand l enquete n a aucune question croisable, ce que l appelant
 * traduit dans son propre vocabulaire (page d erreur ou reponse JSON).
 */
export async function prepareExplore(
	survey: PublicSurvey,
	params: ExploreParams
): Promise<PreparedExplore | null> {
	const {
		x: xQuestion,
		y: yQuestion,
		z: zQuestion
	} = selectAxes(crossableQuestions(survey), params);
	if (!xQuestion) return null;

	const [threshold, populated, x, y, z] = await Promise.all([
		resolveThreshold(survey),
		resolvePopulation(survey, params.filters),
		loadAxis(xQuestion),
		yQuestion ? loadAxis(yQuestion) : null,
		zQuestion ? loadAxis(zQuestion) : null
	]);

	return {
		xQuestion,
		yQuestion,
		x,
		y,
		z,
		population: populated.population,
		dropped: populated.dropped,
		threshold
	};
}

/** Questions proposables au panneau de filtres, avec leurs modalites. */
export function filterableQuestions(survey: PublicSurvey) {
	return crossableQuestions(survey).map((question) => ({
		code: question.code,
		label: question.label,
		modalities: questionModalities(question)
	}));
}
