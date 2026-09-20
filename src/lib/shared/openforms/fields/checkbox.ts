import { asList, type FieldTypeDefinition, type FieldValue, type OpenformsField } from '../types';

/**
 * Choix multiple.
 *
 * Openforms attend un tableau, meme pour une seule coche. La cellule rendue a
 * la normalisation est en revanche une liste separee par des points-virgules,
 * la convention que le type de question `multiple_choice` sait deja lire.
 */
export const checkbox: FieldTypeDefinition = {
	key: 'checkbox',
	label: 'Choix multiple',
	carriesAnswer: true,
	identifying: false,
	questionType: 'multiple_choice',

	blank: () => [],

	validate(field: OpenformsField, value: FieldValue): string | null {
		const chosen = asList(value);
		if (chosen.length === 0) return field.required ? 'Cochez au moins une réponse.' : null;

		if (field.allowOther) return null;

		const declared = new Set(field.options.map((option) => option.value));
		const unknown = chosen.find((entry) => !declared.has(entry));
		return unknown === undefined ? null : "Ce choix ne fait pas partie des réponses proposées.";
	},

	toSubmission: (_field: OpenformsField, value: FieldValue) => asList(value),

	// Plusieurs cases portent le meme `name` : `getAll` les recupere toutes.
	readForm: (field: OpenformsField, form: FormData) =>
		form.getAll(field.key).filter((entry): entry is string => typeof entry === 'string'),

	toCell(value: unknown): unknown {
		if (Array.isArray(value)) return value.map((entry) => String(entry)).join('; ');
		return value;
	}
};
