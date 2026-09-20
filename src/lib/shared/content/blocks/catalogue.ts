import { defineBlockType } from '../types';
import { buttonsField, spacingField, surfaceField } from './common';

/**
 * Un catalogue du site : les enquetes, la mediatheque, les enquetes ouvertes.
 *
 * Ce bloc n'est pas une liste saisie a la main : il affiche ce que la base
 * contient, avec sa recherche, ses filtres et ses effectifs. Le back-office
 * regle ce qui l'entoure, pas la liste elle-meme.
 *
 * La raison est un contrat : les adresses de recherche et de filtre
 * (`/donnees?q=…`, `/medias?type=…`) sont mises en signet et citees par des
 * tiers (AGENTS.md § 1.4). Elles restent produites par le code, pas par une
 * saisie qu'un clic pourrait vider.
 *
 * Ce qui SE regle, c'est le texte affiche quand il n'y a rien a montrer. C'est
 * le moment ou une page a le plus besoin d'etre ecrite, et celui qu'aucun CMS
 * ne laisse jamais modifier.
 */
export const catalogueType = defineBlockType({
	key: 'catalogue',
	label: 'Catalogue du site',
	description: 'Les enquêtes, la médiathèque ou les enquêtes ouvertes, avec leur recherche.',
	group: 'site',

	fields: [
		{
			name: 'source',
			label: 'Ce que le catalogue liste',
			type: 'choice',
			required: false,
			options: [
				{ value: 'donnees', label: 'Les enquêtes publiées et leurs données' },
				{ value: 'medias', label: 'La médiathèque' },
				{ value: 'repondre', label: 'Les enquêtes ouvertes aux réponses' }
			],
			fallback: 'donnees'
		},
		{
			name: 'emptyTitle',
			label: 'Titre quand la liste est vide',
			type: 'text',
			required: true
		},
		{
			name: 'emptyBody',
			label: 'Texte quand la liste est vide',
			type: 'textarea',
			required: true
		},
		buttonsField('Boutons quand la liste est vide'),
		{
			name: 'note',
			label: 'Note sous le catalogue',
			help: 'Licence de réutilisation, accès en JSON, mentions de méthode.',
			type: 'richtext',
			required: false
		},
		surfaceField('cream'),
		spacingField()
	],

	starter: {
		source: 'donnees',
		emptyTitle: 'Rien à afficher pour l’instant',
		emptyBody: 'Ce qui sera publié apparaîtra ici.',
		surface: 'cream',
		spacing: 'normal'
	}
});
