import { parseDeclaredFields, type ContentBlockType, type ContentField } from './types';

const FIELDS: readonly ContentField[] = [
	{ name: 'title', label: 'Titre de la section', type: 'text', required: false },
	{
		name: 'body',
		label: 'Texte',
		help: 'Un paragraphe par ligne vide. Aucune balise : le texte est affiché tel quel.',
		type: 'textarea',
		required: true
	}
];

/** Bloc de texte courant : un titre facultatif et des paragraphes. */
export const richTextType: ContentBlockType = {
	key: 'rich-text',
	label: 'Texte',
	description: 'Une section de texte, avec ou sans titre.',
	fields: FIELDS,

	parseData(raw) {
		return parseDeclaredFields(FIELDS, raw);
	}
};
