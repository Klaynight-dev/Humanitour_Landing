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
 * Deux colonnes : du texte d'un cote, autre chose de l'autre.
 *
 * Quatre sections du site ont cette forme et ne different que par ce qu'elles
 * posent a droite : le bilan du terrain montre un eventail de photos, la page
 * A propos aligne l'identite declaree, le sondage-reportage pose un accent
 * manuscrit, le parcours montre la carte. Un type par section aurait fait
 * quatre fichiers identiques a la colonne de droite pres.
 *
 * La colonne de droite est donc un choix, et les champs qui la remplissent
 * sont ceux du choix retenu ; les autres restent vides et ne s'affichent pas.
 * Rien ne casse si l'on change d'avis : on ne perd que ce qu'on ne montre plus.
 */
export const splitType = defineBlockType({
	key: 'split',
	label: 'Deux colonnes',
	description: 'Du texte à gauche, une image, une carte ou une liste à droite.',
	group: 'texte',

	fields: [
		titleField(),
		...highlightFields(),
		introField('Texte d’introduction'),
		{
			name: 'figures',
			label: 'Chiffres dans la colonne de gauche',
			type: 'list',
			required: false,
			itemLabel: 'un chiffre',
			max: 4,
			item: [
				{ name: 'value', label: 'Chiffre', type: 'text', required: true },
				{ name: 'label', label: 'Ce qu’il compte', type: 'text', required: true }
			]
		},
		{ name: 'body', label: 'Texte sous les chiffres', type: 'richtext', required: false },
		buttonsField(),
		{
			name: 'aside',
			label: 'Contenu de la colonne de droite',
			type: 'choice',
			required: false,
			options: [
				{ value: 'aucun', label: 'Rien : le texte occupe toute la largeur' },
				{ value: 'image', label: 'Une photographie' },
				{ value: 'photos', label: 'L’éventail des photos du tour' },
				{ value: 'liste', label: 'Une liste de mentions' },
				{ value: 'manuscrit', label: 'Une note manuscrite' },
				{ value: 'carte', label: 'La carte du tour' },
				{ value: 'carnet', label: 'Le carnet de route Polarsteps' }
			],
			fallback: 'aucun'
		},
		{
			name: 'asideSide',
			label: 'Côté de cette colonne',
			type: 'choice',
			required: false,
			options: [
				{ value: 'droite', label: 'À droite du texte' },
				{ value: 'gauche', label: 'À gauche du texte' }
			],
			fallback: 'droite'
		},
		{ name: 'image', label: 'Photographie de la seconde colonne', type: 'image', required: false },
		{
			name: 'deckPhotos',
			label: 'Photographies mises en avant',
			help: 'Utilisées par la variante « deck de photos ». Laissez vide pour reprendre les trois premières photographies du tour, telles qu’elles sont écrites dans le code du site.',
			type: 'list',
			required: false,
			max: 3,
			itemLabel: 'une photographie',
			item: [{ name: 'photo', label: 'Photographie', type: 'image', required: true }]
		},
		{
			name: 'asideLink',
			label: 'Lien de l’éventail de photos',
			help: 'Où mène l’éventail, par exemple /galerie.',
			type: 'url',
			required: false
		},
		{ name: 'asideNote', label: 'Note manuscrite', type: 'textarea', required: false },
		{
			name: 'items',
			label: 'Liste de mentions',
			help: 'Un intitulé et sa valeur, comme l’identité déclarée de l’association.',
			type: 'list',
			required: false,
			itemLabel: 'une mention',
			item: [
				{ name: 'term', label: 'Intitulé', type: 'text', required: true },
				{ name: 'value', label: 'Valeur', type: 'text', required: true }
			]
		},
		{
			name: 'itemsLayout',
			label: 'Disposition de la liste de mentions',
			type: 'choice',
			required: false,
			options: [
				{ value: 'colonnes', label: 'Deux colonnes : intitulé, puis valeur' },
				{ value: 'bord-a-bord', label: 'Intitulé à gauche, valeur à droite' }
			],
			fallback: 'colonnes'
		},
		{
			name: 'itemsTitle',
			label: 'Titre de la liste de mentions',
			help: 'Lu par les lecteurs d’écran, invisible à l’écran.',
			type: 'text',
			required: false
		},
		{ name: 'itemsNote', label: 'Note sous la liste de mentions', type: 'richtext', required: false },
		surfaceField('paper'),
		spacingField('ample')
	],

	starter: {
		title: 'Un titre de section',
		intro: 'Le texte de la colonne de gauche.',
		aside: 'aucun',
		surface: 'paper',
		spacing: 'ample'
	}
});
