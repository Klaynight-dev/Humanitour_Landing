import { defineBlockType } from '../types';
import { introField, spacingField, surfaceField, titleField } from './common';

/**
 * Une piece pleine largeur : la carte du tour, le carnet de route, une photo.
 *
 * La carte et le carnet ne sont pas des images : ce sont des composants, avec
 * leur interactivite et leur repli. Le back-office choisit lequel s'affiche et
 * ce qui l'introduit, il ne les reimplemente pas.
 *
 * Le carnet pointe toujours le voyage declare dans `shared/site.ts` : une
 * adresse saisie a la main finirait par designer un autre voyage que celui que
 * le lien « Polarsteps » du site ouvre.
 */
export const embedType = defineBlockType({
	key: 'embed',
	label: 'Carte ou carnet de route',
	description: 'La carte du parcours, le carnet Polarsteps ou une photographie, en pleine largeur.',
	group: 'medias',

	fields: [
		titleField(),
		introField(),
		{
			name: 'content',
			label: 'Ce qui s’affiche',
			type: 'choice',
			required: false,
			options: [
				{ value: 'carte', label: 'La carte du tour' },
				{ value: 'carnet', label: 'Le carnet de route Polarsteps' },
				{ value: 'image', label: 'Une photographie' }
			],
			fallback: 'carte'
		},
		{ name: 'image', label: 'Photographie', type: 'image', required: false },
		{
			name: 'subtitle',
			label: 'Second titre sous la pièce',
			help: 'Pour enchaîner deux pièces dans la même section, comme la carte puis le carnet.',
			type: 'text',
			required: false
		},
		{
			name: 'secondContent',
			label: 'Seconde pièce',
			type: 'choice',
			required: false,
			options: [
				{ value: 'aucune', label: 'Aucune' },
				{ value: 'carte', label: 'La carte du tour' },
				{ value: 'carnet', label: 'Le carnet de route Polarsteps' }
			],
			fallback: 'aucune'
		},
		surfaceField('paper'),
		spacingField('ample')
	],

	starter: { content: 'carte', surface: 'paper', spacing: 'ample' }
});
