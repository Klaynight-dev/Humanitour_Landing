import { defineBlockType } from '../types';
import { introField, spacingField, surfaceField, titleField } from './common';

/**
 * Les chiffres cles, en rangee.
 *
 * Chaque chiffre porte obligatoirement ce qu'il compte, et peut porter sa
 * precision de lecture (effectif, periode, source). C'est la regle editoriale
 * du projet, celle qu'il reproche aux autres instituts de ne pas tenir : un
 * nombre voyage toujours avec ce qu'il mesure.
 *
 * Aucun de ces nombres n'est calcule par le site : ce sont des valeurs
 * publiees, saisies telles quelles. Un chiffre affiche ici est un comptage
 * reel, jamais une estimation (AGENTS.md § 0).
 */
export const figureGridType = defineBlockType({
	key: 'figure-grid',
	label: 'Chiffres',
	description: 'Une rangée de chiffres clés, chacun avec ce qu’il compte.',
	group: 'listes',

	fields: [
		titleField(),
		introField(),
		{
			name: 'items',
			label: 'Chiffres',
			type: 'list',
			required: true,
			itemLabel: 'un chiffre',
			max: 8,
			item: [
				{ name: 'value', label: 'Chiffre', type: 'text', required: true },
				{ name: 'label', label: 'Ce qu’il compte', type: 'text', required: true },
				{
					name: 'hint',
					label: 'Précision',
					help: 'Effectif de base, période, source. Facultatif.',
					type: 'text',
					required: false
				}
			]
		},
		{
			name: 'columns',
			label: 'Colonnes',
			type: 'choice',
			required: false,
			options: [
				{ value: '2', label: 'Deux' },
				{ value: '3', label: 'Trois' },
				{ value: '4', label: 'Quatre' }
			],
			fallback: '4'
		},
		{
			name: 'style',
			label: 'Présentation',
			type: 'choice',
			required: false,
			options: [
				{ value: 'affiche', label: 'Chiffres d’affiche' },
				{ value: 'cartes', label: 'Cartes' }
			],
			fallback: 'affiche'
		},
		surfaceField('ink'),
		spacingField('compact')
	],

	starter: {
		items: [
			{ value: '4 000 km', label: 'À vélo' },
			{ value: '2 mois', label: 'Sur le terrain' }
		],
		columns: '4',
		style: 'affiche',
		surface: 'ink',
		spacing: 'compact'
	}
});
