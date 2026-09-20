import {
	asText,
	flattenCell,
	readSingle,
	type FieldTypeDefinition,
	type FieldValue,
	type OpenformsField
} from '../types';

/**
 * Champ numerique.
 *
 * La saisie reste une chaine jusqu'a l'envoi : un champ vide et un zero doivent
 * rester distincts, et `Number('')` vaut zero. La conversion est donc faite une
 * seule fois, au moment ou l'on sait que la saisie n'est pas vide.
 */
export const number: FieldTypeDefinition = {
	key: 'number',
	label: 'Nombre',
	carriesAnswer: true,
	identifying: false,
	questionType: 'number',

	blank: () => '',

	validate(field: OpenformsField, value: FieldValue): string | null {
		const text = asText(value).trim();
		if (text === '') return field.required ? 'Cette question attend un nombre.' : null;

		const parsed = Number(text.replace(',', '.'));
		if (!Number.isFinite(parsed)) return "Ce n'est pas un nombre.";

		const rules = field.validation;
		if (rules?.min !== undefined && parsed < rules.min) return `Le minimum est ${rules.min}.`;
		if (rules?.max !== undefined && parsed > rules.max) return `Le maximum est ${rules.max}.`;

		return null;
	},

	toSubmission(_field: OpenformsField, value: FieldValue): unknown {
		const text = asText(value).trim();
		if (text === '') return null;
		return Number(text.replace(',', '.'));
	},

	readForm: readSingle,

	toCell: flattenCell
};
