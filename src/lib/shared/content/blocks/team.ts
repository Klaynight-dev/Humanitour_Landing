import { defineBlockType } from '../types';
import { introField, spacingField, surfaceField, titleField } from './common';

/**
 * L'equipe de l'association.
 *
 * Les personnes viennent de `shared/site.ts` — source unique des noms,
 * fonctions et notices, reprise de la plaquette — SAUF si la section porte sa
 * propre liste. Ce repli est ce qui permet a l'accueil et a « A propos » de
 * montrer la meme equipe sans la saisir deux fois : tant que personne n'y
 * touche, les deux lisent le code.
 *
 * La liste saisie a ete ouverte le 21 septembre 2026, a la demande du porteur
 * du projet : l'equipe changeait sans que le back-office puisse la corriger, et
 * attendre un deploiement pour une fonction mal orthographiee n'etait pas
 * tenable. La regle du mandat reste entiere par ailleurs — ce sont des
 * personnes reelles, et ce qu'on ecrit de quelqu'un se relit avec la personne
 * concernee, pas apres coup.
 *
 * Deux presentations : la ligne defilante de l'accueil, qui garde les cinq
 * portraits sur un rang meme sur telephone, et la grille d'A propos, qui donne
 * a chaque fiche sa notice. Les fiches y sont identiques a dessein : ce sont
 * des pairs, et donner plus de place a l'une laisserait entendre une
 * hierarchie qui n'existe pas dans l'association.
 */
export const teamType = defineBlockType({
	key: 'team',
	label: 'L’équipe',
	description: 'Les portraits de l’équipe, en ligne défilante ou en grille.',
	group: 'site',

	fields: [
		titleField(),
		introField(),
		{
			name: 'members',
			label: 'Les personnes',
			help: "Laissez vide pour afficher l'équipe telle qu'elle est écrite dans le code du site. Dès qu'une ligne est saisie, c'est cette liste qui s'affiche, en entier.",
			type: 'list',
			required: false,
			itemLabel: 'une personne',
			item: [
				{ name: 'name', label: 'Nom', type: 'text', required: true },
				{ name: 'role', label: 'Fonction', type: 'text', required: true },
				{ name: 'bio', label: 'Notice', type: 'textarea', required: true },
				{ name: 'portrait', label: 'Portrait', type: 'image', required: false },
				{
					name: 'website',
					label: 'Site personnel',
					help: 'Seulement si la personne en a un et accepte qu’il soit publié.',
					type: 'text',
					required: false
				}
			]
		},
		{
			name: 'layout',
			label: 'Présentation',
			type: 'choice',
			required: false,
			options: [
				{ value: 'ligne', label: 'Une ligne qui défile' },
				{ value: 'grille', label: 'Une grille avec les notices' }
			],
			fallback: 'ligne'
		},
		{
			name: 'moreHref',
			label: 'Adresse du lien « Voir plus »',
			help: 'En fin de ligne, quand l’équipe déborde du cadre. Vide : pas de lien.',
			type: 'url',
			required: false
		},
		surfaceField('ink'),
		spacingField('ample')
	],

	starter: {
		title: 'Qui a posé les questions',
		layout: 'ligne',
		moreHref: '/a-propos',
		surface: 'ink',
		spacing: 'ample'
	}
});
