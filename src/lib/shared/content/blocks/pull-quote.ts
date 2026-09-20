import { defineBlockType } from '../types';
import { spacingField, surfaceField, titleField } from './common';

/**
 * Une citation attribuee, avec son cadre de lecture.
 *
 * L'attribution est obligatoire : une citation sans source ne se publie pas.
 * C'est la meme exigence que pour les chiffres, appliquee aux mots.
 */
export const pullQuoteType = defineBlockType({
	key: 'pull-quote',
	label: 'Citation',
	description: 'Une citation en grand, son auteur, et le texte qui l’encadre.',
	group: 'texte',

	fields: [
		titleField(),
		{
			name: 'subtitle',
			label: 'Sous-titre de la colonne de gauche',
			help: 'Qui parle et quand, en petit, à côté du titre.',
			type: 'text',
			required: false
		},
		{ name: 'quote', label: 'Citation', type: 'textarea', required: true },
		{
			name: 'author',
			label: 'Qui parle',
			help: 'Nom et qualité. Une citation sans source ne se publie pas.',
			type: 'text',
			required: true
		},
		{ name: 'sourceUrl', label: 'Lien vers la source', type: 'url', required: false },
		{
			name: 'body',
			label: 'Texte sous la citation',
			type: 'richtext',
			required: false
		},
		{
			name: 'items',
			label: 'Points développés sous le texte',
			help: 'Un intitulé et son explication. Les trois biais relevés par Bourdieu, par exemple.',
			type: 'list',
			required: false,
			itemLabel: 'un point',
			item: [
				{ name: 'term', label: 'Intitulé', type: 'text', required: true },
				{ name: 'body', label: 'Explication', type: 'textarea', required: true }
			]
		},
		surfaceField('cream'),
		spacingField('ample')
	],

	starter: {
		quote: 'La phrase citée.',
		author: 'Qui l’a dite',
		surface: 'cream',
		spacing: 'ample'
	}
});
