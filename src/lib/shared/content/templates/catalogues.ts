import { formatCount } from '../../format';
import { LICENSES, TOUR } from '../../site';
import type { ContentTemplate } from './types';

/**
 * Les quatre pages de catalogue : galerie, donnees, medias, repondre.
 *
 * Elles ont la meme forme — une couverture puis une liste que la base
 * alimente — et elles sont donc decrites ensemble plutot que dans quatre
 * fichiers qui se recopieraient.
 *
 * Ce qui s'y edite est leur texte, pas leur liste : la recherche, les filtres
 * et les effectifs restent produits par le code, parce que leurs adresses sont
 * un contrat public (AGENTS.md § 1.4).
 */

export const galleryTemplate: ContentTemplate = {
	key: 'GALLERY',
	blocks: [
		{
			type: 'cover',
			data: {
				title: 'Les visages du tour',
				highlight: 'visages',
				highlightStyle: 'brand',
				intro: `${formatCount(TOUR.respondents)} personnes rencontrées en face-à-face, ${TOUR.months} mois de terrain, et chaque soir un hébergement chez des habitants différents. Voici à quoi ça a ressemblé.`,
				fullHeight: 'contenu',
				surface: 'cream',
				spacing: 'compact'
			}
		},
		{
			type: 'gallery',
			data: { surface: 'cream', spacing: 'compact' }
		},
		{
			type: 'text',
			data: {
				body: 'Les entretiens filmés pendant ces rencontres sont publiés au fil du montage, avec les articles et les podcasts.',
				buttons: [
					{ label: 'Voir les médias', href: '/medias', variant: 'primary' },
					{ label: "Comment l'enquête a été menée", href: '/le-tour', variant: 'outline' }
				],
				layout: 'pleine',
				surface: 'cream',
				spacing: 'compact'
			}
		}
	]
};

export const dataTemplate: ContentTemplate = {
	key: 'DATA',
	blocks: [
		{
			type: 'cover',
			data: {
				title: 'Tout est publié. Croisez ce que vous voulez.',
				highlight: 'Croisez',
				highlightStyle: 'brand',
				intro:
					"Chaque enquête expose ses données brutes, sa méthodologie et ses effectifs. Aucune pondération implicite, les non-réponses sont comptées, et vous pouvez croiser n'importe quelle question avec n'importe quelle autre.",
				fullHeight: 'contenu',
				surface: 'cream',
				spacing: 'compact'
			}
		},
		{
			type: 'catalogue',
			data: {
				source: 'donnees',
				emptyTitle: 'Les résultats arrivent',
				emptyBody:
					"L'enquête de terrain est terminée et la saisie des réponses est en cours. Les jeux de données seront publiés ici, bruts et complets, dès qu'ils seront vérifiés.",
				buttons: [
					{ label: "Comment l'enquête a été menée", href: '/le-tour', variant: 'primary' },
					{ label: 'Lire la méthodologie', href: '/methodologie', variant: 'outline' }
				],
				note: {
					blocks: [
						{
							type: 'paragraph',
							items: [
								[
									{ text: 'Données diffusées sous ' },
									{ text: LICENSES.data.name, href: LICENSES.data.url },
									{
										text: " : réutilisation libre, attribution obligatoire, partage à l'identique. Le catalogue est aussi "
									},
									{ text: 'interrogeable en JSON', href: '/api/public/sondages' },
									{ text: '.' }
								]
							]
						}
					]
				},
				surface: 'cream',
				spacing: 'compact'
			}
		}
	]
};

export const mediaTemplate: ContentTemplate = {
	key: 'MEDIA',
	blocks: [
		{
			type: 'cover',
			data: {
				title: 'Les voix derrière les chiffres',
				highlight: 'voix',
				highlightStyle: 'brand',
				intro:
					"Un pourcentage ne dit pas pourquoi quelqu'un vote comme il vote. Les échanges recueillis sur le terrain, eux, le racontent.",
				fullHeight: 'contenu',
				surface: 'cream',
				spacing: 'compact'
			}
		},
		{
			type: 'catalogue',
			data: {
				source: 'medias',
				emptyTitle: 'Le montage est en cours',
				emptyBody:
					'Tous les entretiens du tour ont été enregistrés. Ils seront publiés ici au fil du montage, en articles, en vidéos et en podcasts.',
				buttons: [
					{ label: "Comment l'enquête a été menée", href: '/le-tour', variant: 'primary' }
				],
				surface: 'cream',
				spacing: 'compact'
			}
		}
	]
};

export const answerTemplate: ContentTemplate = {
	key: 'ANSWER',
	blocks: [
		{
			type: 'cover',
			data: {
				title: 'On vous a raté sur la route ? Répondez ici.',
				highlight: 'Répondez ici.',
				highlightStyle: 'brand',
				intro:
					'Nous avons posé ces questions en face-à-face, à vélo, sur quatre mille kilomètres. Les enquêtes encore ouvertes se remplissent aussi depuis cette page. Aucun compte à créer, aucune adresse demandée, et vos réponses partent dans les mêmes données brutes que les autres.',
				fullHeight: 'contenu',
				surface: 'cream',
				spacing: 'compact'
			}
		},
		{
			type: 'catalogue',
			data: {
				source: 'repondre',
				emptyTitle: "Aucune enquête n'est ouverte en ce moment.",
				emptyBody:
					"Le terrain est clos pour l'instant. Les résultats déjà collectés, eux, restent consultables et téléchargeables.",
				buttons: [{ label: 'Voir les données', href: '/donnees', variant: 'primary' }],
				surface: 'cream',
				spacing: 'compact'
			}
		}
	]
};
