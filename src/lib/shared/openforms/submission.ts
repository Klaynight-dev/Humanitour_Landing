import { requireFieldType } from './fields';
import { asText, type FieldValue, type OpenformsField } from './types';

/**
 * Ce qui relie une saisie a un envoi : visibilite conditionnelle, validation,
 * puis mise en forme de la charge utile.
 *
 * Les trois vivent ensemble parce qu'elles partagent la meme regle et qu'une
 * divergence entre elles serait un bug silencieux : un champ masque qu'on
 * validerait quand meme bloquerait l'envoi sans rien afficher, et un champ
 * masque qu'on enverrait quand meme ferait entrer une reponse a une question
 * que le repondant n'a jamais vue.
 */

/** L'etat courant du questionnaire : une saisie par cle de champ. */
export type FormValues = Readonly<Record<string, FieldValue>>;

/**
 * Le champ est-il visible compte tenu des saisies deja faites ?
 *
 * Openforms ne propose qu'une condition par champ : « n'apparaitre que si tel
 * autre champ vaut telle valeur ». Un choix multiple satisfait la condition des
 * qu'il contient la valeur attendue.
 */
export function isVisible(field: OpenformsField, values: FormValues): boolean {
	const condition = field.condition;
	if (!condition) return true;

	const current = values[condition.fieldKey];
	if (current === undefined) return false;

	if (Array.isArray(current)) return current.includes(condition.value);
	return asText(current) === condition.value;
}

/** Les champs effectivement poses au repondant, dans l'ordre du questionnaire. */
export function visibleFields(
	fields: readonly OpenformsField[],
	values: FormValues
): readonly OpenformsField[] {
	return fields.filter((field) => isVisible(field, values));
}

/** Etat de depart : la valeur vide de chaque champ, selon son type. */
export function blankValues(fields: readonly OpenformsField[]): Record<string, FieldValue> {
	const values: Record<string, FieldValue> = {};

	for (const field of fields) {
		const type = requireFieldType(field.type);
		if (type.carriesAnswer) values[field.key] = type.blank(field);
	}

	return values;
}

/**
 * Reconstitue l'etat du questionnaire a partir d'un envoi HTML.
 *
 * C'est le pendant serveur de `blankValues` : le formulaire fonctionne sans
 * JavaScript, donc le serveur doit savoir relire ce que le navigateur a envoye
 * tout seul. Chaque type sait lire ses propres controles.
 */
export function readFormValues(
	fields: readonly OpenformsField[],
	form: FormData
): Record<string, FieldValue> {
	const values: Record<string, FieldValue> = {};

	for (const field of fields) {
		const type = requireFieldType(field.type);
		if (type.carriesAnswer) values[field.key] = type.readForm(field, form);
	}

	return values;
}

/** Motifs de refus, indexes par cle de champ. Vide si la saisie passe. */
export type ValidationErrors = Readonly<Record<string, string>>;

/**
 * Valide toutes les saisies visibles.
 *
 * Un champ masque par une condition n'est pas valide : il n'a pas ete pose, il
 * ne peut donc pas manquer. C'est le seul endroit ou cette regle s'ecrit.
 */
export function validateAll(
	fields: readonly OpenformsField[],
	values: FormValues
): ValidationErrors {
	const errors: Record<string, string> = {};

	for (const field of visibleFields(fields, values)) {
		const type = requireFieldType(field.type);
		if (!type.carriesAnswer) continue;

		const reason = type.validate(field, values[field.key] ?? type.blank(field));
		if (reason) errors[field.key] = reason;
	}

	return errors;
}

/**
 * Construit la charge `data` attendue par `POST /api/v1/responses/submit`.
 *
 * Seuls les champs visibles ET porteurs de reponse y entrent. Une valeur vide
 * est omise plutot qu'envoyee a vide : Openforms la compterait comme une
 * saisie, alors qu'une question sans reponse est une non-reponse, et c'est la
 * normalisation qui la comptera comme telle a la synchronisation.
 */
export function buildSubmission(
	fields: readonly OpenformsField[],
	values: FormValues
): Record<string, unknown> {
	const data: Record<string, unknown> = {};

	for (const field of visibleFields(fields, values)) {
		const type = requireFieldType(field.type);
		if (!type.carriesAnswer) continue;

		const payload = type.toSubmission(field, values[field.key] ?? type.blank(field));
		if (payload === undefined || payload === null || payload === '') continue;
		if (Array.isArray(payload) && payload.length === 0) continue;

		data[field.key] = payload;
	}

	return data;
}
