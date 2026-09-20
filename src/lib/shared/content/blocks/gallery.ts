import { defineBlockType } from '../types';
import { introField, spacingField, surfaceField, titleField } from './common';

/**
 * La galerie des photographies du tour.
 *
 * Les cliches viennent de `shared/photos.ts` : ils sont dans le depot, avec
 * leurs dimensions natives relevees sur les fichiers eux-memes. Les saisir ici
 * un par un ferait diverger la galerie de l'eventail de l'accueil, qui montre
 * les trois premieres du meme tableau.
 *
 * Les personnes photographiees ont donne leur accord pour l'usage de leur
 * image (CLAUDE.md, « Mandat »).
 */
export const galleryType = defineBlockType({
	key: 'gallery',
	label: 'Galerie de photos',
	description: 'Les photographies du tour, en mosaïque.',
	group: 'medias',

	fields: [
		titleField(),
		introField(),
		{
			name: 'limit',
			label: 'Nombre de photos affichées',
			help: 'Vide : toutes. Sinon, les premières de la série.',
			type: 'number',
			required: false
		},
		surfaceField('paper'),
		spacingField()
	],

	starter: { surface: 'paper', spacing: 'normal' }
});
