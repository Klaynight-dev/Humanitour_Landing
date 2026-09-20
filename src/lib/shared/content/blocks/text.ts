import { defineBlockType } from '../types';
import {
	buttonsField,
	highlightFields,
	introField,
	spacingField,
	surfaceField,
	titleField
} from './common';

/**
 * Une section de texte courant.
 *
 * Trois compositions, reprises telles quelles des pages existantes :
 * pleine largeur, titre en colonne etroite a gauche (« Ce qu'on a demande »),
 * ou texte en deux colonnes. Le corps est du texte enrichi, jamais du HTML :
 * un compte compromis ne peut poser aucune balise sur le site public.
 */
export const textType = defineBlockType({
	key: 'text',
	label: 'Texte',
	description: 'Un titre, un texte mis en forme, et de quoi le prolonger.',
	group: 'texte',

	fields: [
		titleField(),
		...highlightFields(),
		introField(),
		{
			name: 'body',
			label: 'Texte',
			help: 'Gras, italique, listes, sous-titres et liens. Sans JavaScript, un paragraphe par ligne vide.',
			type: 'richtext',
			required: true
		},
		{
			name: 'layout',
			label: 'Composition',
			type: 'choice',
			required: false,
			options: [
				{ value: 'pleine', label: 'Pleine largeur' },
				{ value: 'colonne', label: 'Titre en colonne à gauche' },
				{ value: 'encadre', label: 'Encadré sur la page' }
			],
			fallback: 'pleine'
		},
		{
			name: 'items',
			label: 'Points détaillés sous le texte',
			help: 'Affichés en deux colonnes. Utile pour détailler deux cas d’un même principe.',
			type: 'list',
			required: false,
			itemLabel: 'un point',
			max: 4,
			item: [
				{ name: 'term', label: 'Intitulé', type: 'text', required: true },
				{ name: 'body', label: 'Explication', type: 'textarea', required: true }
			]
		},
		{
			name: 'note',
			label: 'Note de bas de section',
			help: 'En plus petit, sous le reste : une précision, une source.',
			type: 'textarea',
			required: false
		},
		buttonsField(),
		surfaceField('paper'),
		spacingField()
	],

	starter: {
		title: 'Un titre de section',
		body: 'Le texte de la section.\n\nUn paragraphe par ligne vide.',
		layout: 'pleine',
		surface: 'paper',
		spacing: 'normal'
	}
});
