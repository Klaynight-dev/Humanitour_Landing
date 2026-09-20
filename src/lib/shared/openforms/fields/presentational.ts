import type { FieldTypeDefinition } from '../types';

/**
 * Champs de mise en page : titre de section, bloc de texte.
 *
 * Ils structurent le questionnaire sans rien collecter. `carriesAnswer` a faux
 * suffit a les tenir hors de la validation, de l'envoi et du comptage : il n'y
 * a donc aucun `if (type === 'section')` a ecrire ailleurs.
 */
function presentational(key: string, label: string): FieldTypeDefinition {
	return {
		key,
		label,
		carriesAnswer: false,
		identifying: false,
		questionType: null,

		blank: () => '',
		validate: () => null,
		toSubmission: () => undefined,
		readForm: () => '',
		toCell: () => undefined
	};
}

export const section = presentational('section', 'Titre de section');
export const textBlock = presentational('text_block', 'Bloc de texte');
