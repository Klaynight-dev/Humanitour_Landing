import {
	asText,
	flattenCell,
	readSingle,
	type FieldTypeDefinition,
	type FieldValue,
	type OpenformsField
} from '../types';

/**
 * Dates et dates-heures.
 *
 * `questionType` vaut `null` : aucun type de question Humanitour ne recoit une
 * date aujourd'hui. Le champ s'affiche, se remplit et se soumet normalement a
 * Openforms — il n'entre simplement pas dans les croisements publies, et la
 * fiche de liaison du back-office le signale au lieu de le taire.
 *
 * Le format est celui des controles HTML natifs, qui est aussi celui
 * qu'Openforms attend : `AAAA-MM-JJ` et `AAAA-MM-JJTHH:MM`.
 */
function dateLike(key: string, label: string, pattern: RegExp, expected: string): FieldTypeDefinition {
	return {
		key,
		label,
		carriesAnswer: true,
		identifying: false,
		questionType: null,

		blank: () => '',

		validate(field: OpenformsField, value: FieldValue): string | null {
			const text = asText(value).trim();
			if (text === '') return field.required ? 'Cette question attend une date.' : null;
			if (!pattern.test(text)) return `Format attendu : ${expected}.`;
			return Number.isNaN(Date.parse(text)) ? "Cette date n'existe pas." : null;
		},

		toSubmission: (_field: OpenformsField, value: FieldValue) => asText(value).trim(),

		readForm: readSingle,

		toCell: flattenCell
	};
}

export const date = dateLike('date', 'Date', /^\d{4}-\d{2}-\d{2}$/, 'AAAA-MM-JJ');

export const datetime = dateLike(
	'datetime',
	'Date et heure',
	/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/,
	'AAAA-MM-JJTHH:MM'
);
