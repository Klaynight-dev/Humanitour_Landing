import { collapseOther } from '../other';
import {
	asText,
	readSingle,
	type FieldTypeDefinition,
	type FieldValue,
	type OpenformsField
} from '../types';

/**
 * Choix unique : boutons radio ou liste deroulante.
 *
 * Meme comportement, meme validation, meme envoi — seul le widget change, et il
 * vit dans le registre de composants.
 *
 * La saisie est verifiee CONTRE LES OPTIONS DECLAREES et non seulement contre le
 * vide. Un formulaire poste a la main pourrait sinon deposer une modalite qui
 * n'existe pas, et elle apparaitrait telle quelle dans un resultat publie.
 */
function singleChoice(key: string, label: string): FieldTypeDefinition {
	return {
		key,
		label,
		carriesAnswer: true,
		identifying: false,
		questionType: 'single_choice',

		blank: () => '',

		validate(field: OpenformsField, value: FieldValue): string | null {
			const chosen = asText(value).trim();
			if (chosen === '') return field.required ? 'Choisissez une réponse.' : null;

			// « Autre » ouvre la saisie libre : la valeur ne figure alors pas dans
			// les options declarees, et c'est normal.
			if (field.allowOther) return null;

			const known = field.options.some((option) => option.value === chosen);
			return known ? null : 'Ce choix ne fait pas partie des réponses proposées.';
		},

		toSubmission: (_field: OpenformsField, value: FieldValue) => asText(value).trim(),

		readForm: readSingle,

		// « Autre » se range dans sa modalite, le texte libre reste dehors
		// (`shared/openforms/other`).
		toCell: (value: unknown) => (typeof value === 'string' ? collapseOther(value) : value)
	};
}

export const radio = singleChoice('radio', 'Choix unique');
export const select = singleChoice('select', 'Liste déroulante');
