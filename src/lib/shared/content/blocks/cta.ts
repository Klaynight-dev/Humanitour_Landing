import { defineBlockType } from '../types';
import { buttonsField, highlightFields, spacingField, surfaceField, titleField } from './common';

/**
 * La cloture d'une page : ce qu'on propose de faire ensuite.
 *
 * Elle est posee sur le degrade de marque, et son texte est noir — jamais
 * blanc : blanc sur l'orange de la charte ne donne que 2,69:1. Le choix de
 * surface reste ouvert, mais chacune porte sa propre couleur de texte, verifiee
 * une fois dans `app.css` plutot qu'a chaque section.
 */
export const ctaType = defineBlockType({
	key: 'cta',
	label: 'Appel à l’action',
	description: 'Une clôture de page : une phrase forte et des boutons.',
	group: 'action',

	fields: [
		titleField(true),
		...highlightFields(),
		{ name: 'intro', label: 'Phrase d’appui', type: 'textarea', required: false },
		buttonsField(),
		surfaceField('brand'),
		spacingField('ample')
	],

	starter: {
		title: 'Une phrase qui appelle à agir',
		buttons: [{ label: 'Adhérer', href: '/', variant: 'primary' }],
		surface: 'brand',
		spacing: 'ample'
	}
});
