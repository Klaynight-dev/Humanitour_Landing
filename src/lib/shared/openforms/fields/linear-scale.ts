import {
	asText,
	flattenCell,
	readSingle,
	type FieldTypeDefinition,
	type FieldValue,
	type OpenformsField
} from '../types';

/**
 * Echelle lineaire.
 *
 * Les bornes viennent de `validation.min` et `validation.max` chez Openforms.
 * A defaut, l'echelle de 1 a 5 est celle que son builder propose par defaut :
 * la reprendre ici evite de refuser une saisie legitime sur un formulaire qui
 * n'a pas declare ses bornes explicitement.
 */
const DEFAULT_MIN = 1;
const DEFAULT_MAX = 5;

/** Bornes effectives d'un champ d'echelle, valeurs par defaut comprises. */
export function scaleBounds(field: OpenformsField): { min: number; max: number } {
	const min = field.validation?.min ?? DEFAULT_MIN;
	const max = field.validation?.max ?? DEFAULT_MAX;
	// Un formulaire mal configure peut inverser les bornes : les remettre dans
	// l'ordre vaut mieux que rendre une echelle vide.
	return min <= max ? { min, max } : { min: max, max: min };
}

export const linearScale: FieldTypeDefinition = {
	key: 'linear_scale',
	label: 'Échelle',
	carriesAnswer: true,
	identifying: false,
	questionType: 'scale',

	blank: () => '',

	validate(field: OpenformsField, value: FieldValue): string | null {
		const text = asText(value).trim();
		if (text === '') return field.required ? 'Choisissez une valeur sur l’échelle.' : null;

		const parsed = Number(text);
		if (!Number.isInteger(parsed)) return "Cette échelle attend un nombre entier.";

		const { min, max } = scaleBounds(field);
		if (parsed < min || parsed > max) return `La valeur doit être comprise entre ${min} et ${max}.`;

		return null;
	},

	toSubmission(_field: OpenformsField, value: FieldValue): unknown {
		const text = asText(value).trim();
		return text === '' ? null : Number(text);
	},

	readForm: readSingle,

	toCell: flattenCell
};
