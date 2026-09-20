import {
	asText,
	checkTextBounds,
	flattenCell,
	readSingle,
	type FieldTypeDefinition,
	type FieldValue,
	type OpenformsField
} from '../types';

/**
 * Champs de saisie libre : ligne unique et paragraphe.
 *
 * Les deux partagent exactement la meme validation et la meme mise en forme ;
 * seul le widget differe, et le widget vit dans le registre de composants. Les
 * separer en deux fichiers identiques aurait produit deux implementations a
 * maintenir en parallele, donc a faire diverger (AGENTS.md section 1.5).
 */
function freeText(key: string, label: string): FieldTypeDefinition {
	return {
		key,
		label,
		carriesAnswer: true,
		identifying: false,
		questionType: 'free_text',

		blank: () => '',

		validate(field: OpenformsField, value: FieldValue): string | null {
			const text = asText(value).trim();
			if (text === '') return field.required ? 'Cette question attend une réponse.' : null;
			return checkTextBounds(field, text);
		},

		toSubmission: (_field: OpenformsField, value: FieldValue) => asText(value).trim(),

		readForm: readSingle,

		toCell: flattenCell
	};
}

export const shortText = freeText('short_text', 'Texte court');
export const paragraph = freeText('paragraph', 'Paragraphe');
