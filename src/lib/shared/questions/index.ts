import { freeText } from './free-text';
import { multipleChoice } from './multiple-choice';
import { numberQuestion } from './number';
import { scale } from './scale';
import { singleChoice } from './single-choice';
import type { QuestionType } from './types';

/**
 * Registre des types de question.
 *
 * Ajouter un type : ecrire le fichier, l ajouter a cette liste. Rien d autre —
 * ni colonne en base, ni `switch` dans un composant (AGENTS.md section 2).
 */
const REGISTERED: readonly QuestionType[] = [
	singleChoice,
	multipleChoice,
	scale,
	numberQuestion,
	freeText
];

const BY_KEY = new Map(REGISTERED.map((type) => [type.key, type]));

export const QUESTION_TYPES = REGISTERED;

export function getQuestionType(key: string): QuestionType | null {
	return BY_KEY.get(key) ?? null;
}

/**
 * Meme chose, mais en echouant bruyamment.
 *
 * A utiliser partout ou un type manquant signifie une base incoherente : mieux
 * vaut une erreur qu un graphique silencieusement vide.
 */
export function requireQuestionType(key: string): QuestionType {
	const type = BY_KEY.get(key);
	if (!type) throw new Error(`Type de question inconnu : « ${key} ».`);
	return type;
}

/** Types proposes comme axe dans l explorateur. */
export function crossableQuestionTypes(): readonly QuestionType[] {
	return REGISTERED.filter((type) => type.crossable);
}

export * from './types';
