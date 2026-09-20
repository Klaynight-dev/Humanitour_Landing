import { defineBlockType } from '../types';
import { highlightFields, introField, spacingField, surfaceField, titleField } from './common';

/**
 * Des cartes chiffrees, en rangee.
 *
 * Un chiffre en tete, une phrase dessous : c'est la composition de la section
 * sur le cout des sondages publics. Elle differe de la rangee de chiffres
 * parce que la phrase y est un argument, pas un libelle — elle fait deux
 * lignes, parfois trois.
 */
export const cardsType = defineBlockType({
	key: 'cards',
	label: 'Cartes chiffrées',
	description: 'Un chiffre et un paragraphe, en deux à quatre colonnes.',
	group: 'listes',

	fields: [
		titleField(),
		...highlightFields(),
		introField(),
		{
			name: 'items',
			label: 'Cartes',
			type: 'list',
			required: true,
			itemLabel: 'une carte',
			max: 4,
			item: [
				{ name: 'figure', label: 'Chiffre', type: 'text', required: true },
				{ name: 'body', label: 'Ce qu’il raconte', type: 'textarea', required: true }
			]
		},
		{
			name: 'note',
			label: 'Note sous les cartes',
			help: 'La source des chiffres.',
			type: 'textarea',
			required: false
		},
		surfaceField('paper'),
		spacingField('ample')
	],

	starter: {
		title: 'Un titre de section',
		items: [{ figure: '1 000', body: 'Ce que ce chiffre raconte.' }],
		surface: 'paper',
		spacing: 'ample'
	}
});
