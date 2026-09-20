import { defineBlockType } from '../types';
import { introField, spacingField, surfaceField, titleField } from './common';

/**
 * Le formulaire d'inscription a l'infolettre, integre directement a la page.
 *
 * Il poste vers l'action de `/infolettre` : meme frein par adresse IP, meme
 * consentement obligatoire, meme ecriture en base. Cette section n'est donc
 * pas une seconde collecte, juste un second point d'entree vers la premiere.
 */
export const newsletterType = defineBlockType({
	key: 'newsletter',
	label: 'Infolettre',
	description: "Le formulaire d'inscription à l'infolettre, intégré à la page.",
	group: 'action',

	fields: [titleField(true), introField(), surfaceField('paper'), spacingField('ample')],

	starter: {
		title: "Être prévenu·e à la sortie",
		intro:
			"Les résultats de l'enquête et la série documentaire seront publiés ici. Laissez votre adresse : nous n'écrivons que lorsqu'il y a quelque chose à lire.",
		surface: 'paper',
		spacing: 'ample'
	}
});
