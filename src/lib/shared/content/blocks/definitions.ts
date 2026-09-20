import { defineBlockType } from '../types';
import {
	buttonsField,
	highlightFields,
	introField,
	shapesField,
	spacingField,
	surfaceField,
	titleField
} from './common';

/**
 * Une liste de couples « terme / explication ».
 *
 * Elle porte les engagements de l'association, les biais de Bourdieu, la
 * methode du tour et l'identite declaree : quatre sections qui ont exactement
 * la meme structure, et qui ne different que par la largeur de leur colonne
 * de gauche. C'est un `dl`, pas une grille de cartes : un terme et sa
 * definition forment un couple, et le balisage doit le dire.
 */
export const definitionsType = defineBlockType({
	key: 'definitions',
	label: 'Liste terme / explication',
	description: 'Des intitulés avec leur explication, l’un sous l’autre.',
	group: 'listes',

	fields: [
		titleField(),
		...highlightFields(),
		introField(),
		{
			name: 'items',
			label: 'Entrées',
			type: 'list',
			required: true,
			itemLabel: 'une entrée',
			item: [
				{ name: 'term', label: 'Intitulé', type: 'text', required: true },
				{ name: 'body', label: 'Explication', type: 'textarea', required: true },
				{
					name: 'consequence',
					label: 'Ce que cette règle coûte',
					help: 'Détaché par un filet corail. Une règle dont on ne montre que le bénéfice est un argument, pas une méthode.',
					type: 'textarea',
					required: false
				}
			]
		},
		{
			name: 'layout',
			label: 'Largeur de la colonne des intitulés',
			type: 'choice',
			required: false,
			options: [
				{ value: 'etroite', label: 'Étroite' },
				{ value: 'large', label: 'Large' },
				{ value: 'empilee', label: 'Intitulé au-dessus' }
			],
			fallback: 'etroite'
		},
		buttonsField(),
		shapesField(),
		surfaceField('cream'),
		spacingField()
	],

	starter: {
		title: 'Une liste d’engagements',
		items: [{ term: 'Un intitulé', body: 'Ce qu’il veut dire, en une ou deux phrases.' }],
		layout: 'etroite',
		surface: 'cream',
		spacing: 'normal'
	}
});
