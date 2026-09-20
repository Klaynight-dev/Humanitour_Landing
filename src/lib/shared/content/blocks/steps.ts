import { defineBlockType } from '../types';
import { buttonsField, introField, spacingField, surfaceField, titleField } from './common';

/**
 * Une liste numerotee, avec son intitule en colonne etroite.
 *
 * C'est la composition des quatre questions de l'accueil, et elle n'est
 * employee qu'une fois par page : la numerotation dit que l'ordre compte.
 * Pour les questions de terrain, cet ordre EST une donnee — le libelle et le
 * rang de passation font partie du resultat (AGENTS.md § 0).
 */
export const stepsType = defineBlockType({
	key: 'steps',
	label: 'Liste numérotée',
	description: 'Une suite d’énoncés dans un ordre qui compte, avec un chapô à gauche.',
	group: 'listes',

	fields: [
		titleField(),
		introField(),
		{
			name: 'items',
			label: 'Énoncés',
			type: 'list',
			required: true,
			itemLabel: 'un énoncé',
			item: [{ name: 'text', label: 'Énoncé', type: 'textarea', required: true }]
		},
		buttonsField(),
		surfaceField('paper'),
		spacingField()
	],

	starter: {
		title: 'Ce qu’on a demandé',
		items: [{ text: 'Le premier énoncé.' }],
		surface: 'paper',
		spacing: 'normal'
	}
});
