import { parseDeclaredFields, type ContentBlockType, type ContentField } from './types';

const FIELDS: readonly ContentField[] = [
	{ name: 'title', label: 'Titre', type: 'text', required: true },
	{
		name: 'subtitle',
		label: 'Sous-titre',
		help: "Une phrase, pas un paragraphe : elle s'affiche en grand.",
		type: 'textarea',
		required: false
	},
	{ name: 'ctaLabel', label: "Libellé du bouton", type: 'text', required: false },
	{ name: 'ctaHref', label: 'Adresse du bouton', type: 'url', required: false },
	{
		name: 'imageUrl',
		label: 'Photographie',
		help: 'Adresse de la photo, par exemple /photos/tour-depart.jpg. Une photo de terrain réelle, jamais une image de banque.',
		type: 'url',
		required: false
	},
	{
		name: 'imageAlt',
		label: 'Description de la photographie',
		help: "Ce qu'on voit, pour qui ne voit pas l'image.",
		type: 'textarea',
		required: false
	}
];

/** Couverture de page : le premier écran, titre et appel à l'action. */
export const heroType: ContentBlockType = {
	key: 'hero',
	label: 'Couverture',
	description: "Le haut de page : titre, accroche, bouton et photographie.",
	fields: FIELDS,

	parseData(raw) {
		return parseDeclaredFields(FIELDS, raw);
	}
};
