import { readString, type MediaType } from './types';

/** Article redige et heberge chez nous. Rendu cote serveur, donc indexable. */
export const articleType: MediaType = {
	key: 'ARTICLE',
	label: 'Article',
	plural: 'Articles',
	description: "Un texte redige par l'equipe, publie ici.",
	hasBody: true,
	isOutbound: false,
	fields: [
		{
			name: 'standfirst',
			label: 'Chapo',
			help: "Phrase d'accroche affichee sous le titre.",
			type: 'textarea',
			required: false
		}
	],

	parseData(raw) {
		const standfirst = readString(raw, 'standfirst');
		return { ok: true, data: standfirst ? { standfirst } : {} };
	}
};
