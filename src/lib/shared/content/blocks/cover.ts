import { defineBlockType } from '../types';
import { buttonsField, highlightFields, spacingField, surfaceField } from './common';

/**
 * La couverture : le premier ecran d'une page.
 *
 * C'est la section la plus reglee du site et donc celle qui porte le plus de
 * variantes : la couverture de l'accueil tient dans un ecran avec une photo a
 * droite, celle d'A propos s'ouvre sur du creme et des aplats, celle du Tour
 * porte le shader anime. Trois pages, trois compositions, un seul type — sans
 * quoi « changer la photo du premier ecran » demanderait un deploiement.
 *
 * `fullHeight` est le reglage que l'accueil utilise : la section tient dans la
 * hauteur de l'ecran, en-tete deduit. Elle grandit si le texte ne rentre pas
 * (petit ecran, corps agrandi) : une couverture qui deborde vaut mieux qu'un
 * titre coupe.
 */
export const coverType = defineBlockType({
	key: 'cover',
	label: 'Couverture',
	description: 'Le premier écran : titre, accroche, chiffres, boutons et photographie.',
	group: 'couverture',

	fields: [
		{ name: 'title', label: 'Titre', type: 'text', required: true },
		...highlightFields(),
		{
			name: 'intro',
			label: 'Accroche',
			help: "Une phrase, pas un paragraphe : elle s'affiche en grand.",
			type: 'textarea',
			required: false
		},
		{
			name: 'figures',
			label: 'Chiffres sous l’accroche',
			help: 'Chaque chiffre porte ce qu’il compte. Un nombre seul n’est pas une information.',
			type: 'list',
			required: false,
			itemLabel: 'un chiffre',
			max: 4,
			item: [
				{ name: 'value', label: 'Chiffre', type: 'text', required: true },
				{ name: 'label', label: 'Ce qu’il compte', type: 'text', required: true }
			]
		},
		buttonsField(),
		{
			name: 'image',
			label: 'Photographie',
			help: 'Une photo de terrain réelle, jamais une image de banque.',
			type: 'image',
			required: false
		},
		{
			name: 'accent',
			label: 'Note manuscrite sur la photo',
			help: 'L’accent manuscrit de la charte. Une seule fois par page.',
			type: 'textarea',
			required: false
		},
		{
			name: 'fullHeight',
			label: 'Hauteur',
			type: 'choice',
			required: false,
			options: [
				{ value: 'ecran', label: 'Tient dans l’écran' },
				{ value: 'contenu', label: 'S’adapte au contenu' }
			],
			fallback: 'contenu'
		},
		{
			name: 'decor',
			label: 'Décor de fond',
			help: 'Les aplats vont sur le crème. Le mouvement est réservé à la page du tour.',
			type: 'choice',
			required: false,
			options: [
				{ value: 'aucun', label: 'Aucun' },
				{ value: 'aplats', label: 'Aplats colorés dans les marges' },
				{ value: 'mouvement', label: 'Dégradé animé' }
			],
			fallback: 'aucun'
		},
		surfaceField('cream'),
		spacingField()
	],

	starter: {
		title: 'Un titre de couverture',
		intro: 'Une phrase qui dit ce que la page contient.',
		surface: 'cream',
		fullHeight: 'contenu',
		decor: 'aucun',
		spacing: 'normal'
	}
});
