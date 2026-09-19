import { parseDeclaredFields, type ContentBlockType, type ContentField } from './types';

const FIELDS: readonly ContentField[] = [
	{ name: 'quote', label: 'Citation', type: 'textarea', required: true },
	{
		name: 'author',
		label: 'Qui parle',
		help: 'Nom et qualité. Une citation sans source ne se publie pas.',
		type: 'text',
		required: true
	},
	{ name: 'sourceUrl', label: 'Lien vers la source', type: 'url', required: false }
];

export const quoteType: ContentBlockType = {
	key: 'quote',
	label: 'Citation',
	description: 'Une citation attribuée, avec sa source.',
	fields: FIELDS,

	parseData(raw) {
		return parseDeclaredFields(FIELDS, raw);
	}
};
