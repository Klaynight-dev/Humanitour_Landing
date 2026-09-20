import { defineBlockType } from '../types';
import { introField, spacingField, surfaceField, titleField } from './common';

/**
 * L'equipe de l'association.
 *
 * Les personnes ne sont pas saisies ici : elles viennent de `shared/site.ts`,
 * source unique des noms, fonctions et notices, reprise de la plaquette. Ce
 * sont des personnes reelles, leurs fiches ne se reformulent pas depuis un
 * back-office (CLAUDE.md, « Mandat »). Ce que la section laisse regler, c'est
 * ce qui l'entoure : son titre, son propos, et la facon de montrer la rangee.
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
