import {
	HOST,
	INCUBATOR,
	LICENSES,
	LINKS,
	ORGANISATION,
	POLLING,
	SITE,
	TOUR
} from '../../site';
import { formatCount } from '../../format';
import type { ContentTemplate } from './types';

/**
 * A propos, telle qu'elle a ete composee.
 *
 * Les mentions d'identite sont celles qui sont declarees a la prefecture : ce
 * sont des informations legales, reprises de `shared/site.ts`, qui alimente
 * aussi les mentions legales et le pied de page. Elles ne se saisissent pas
 * deux fois.
 */

const IDENTITY = [
	{ term: 'Raison sociale', value: ORGANISATION.legalName },
	{ term: 'Forme', value: ORGANISATION.form },
	{ term: 'RNA', value: ORGANISATION.rna },
	{ term: 'Siège', value: ORGANISATION.address },
	{ term: 'Déclaration', value: ORGANISATION.declaration },
	{ term: 'Directeur de publication', value: ORGANISATION.publicationDirector },
	{ term: 'Hébergeur', value: `${HOST.name}, ${HOST.dataCenter}` }
];

/**
 * Les licences, avec leurs liens.
 *
 * Ecrit comme un document structure et non comme une phrase a trous : c'est le
 * seul moyen de poser deux liens dans un paragraphe sans passer par du HTML,
 * que le modele de contenu interdit par construction.
 */
const LICENCE_NOTE = {
	blocks: [
		{
			type: 'paragraph',
			items: [
				[
					{ text: 'Le code est sous ' },
					{ text: LICENSES.code.name, href: LICENSES.code.url },
					{ text: ', les données sous ' },
					{ text: LICENSES.data.name, href: LICENSES.data.url },
					{ text: '.' }
				]
			]
		}
	]
};

const STRUCTURE_BODY = {
	blocks: [
		{
			type: 'heading',
			items: [[{ text: `${INCUBATOR.label} : ${INCUBATOR.name}` }]]
		},
		{ type: 'paragraph', items: [[{ text: INCUBATOR.body }]] },
		{
			type: 'paragraph',
			items: [
				[
					{ text: `L'association applique le ${POLLING.code}. Les sondages électoraux relèvent du contrôle de la ` },
					{ text: 'Commission des sondages', href: POLLING.commissionUrl },
					{ text: '.' }
				]
			]
		}
	]
};

export const aboutTemplate: ContentTemplate = {
	key: 'ABOUT',
	blocks: [
		{
			type: 'cover',
			data: {
				title: 'Un collectif engagé',
				highlight: 'engagé',
				highlightStyle: 'brand',
				intro: `Cinq personnes, une association loi 1901, et aucun actionnaire. Voilà qui a posé les questions sur ${formatCount(TOUR.kilometres)} kilomètres.`,
				fullHeight: 'contenu',
				decor: 'aplats',
				surface: 'cream',
				spacing: 'normal'
			}
		},
		{
			type: 'team',
			data: { layout: 'grille', surface: 'cream', spacing: 'compact' }
		},
		{
			type: 'split',
			data: {
				title: 'Ce qui porte le projet',
				intro:
					"Humanitour est une association à but non lucratif. Elle ne vend pas de question, n'accepte pas de commanditaire et ne revend aucune donnée. Son financement vient des adhésions et des dons.",
				body: STRUCTURE_BODY,
				aside: 'liste',
				asideSide: 'droite',
				items: IDENTITY,
				itemsTitle: "Identité déclarée de l'association",
				itemsNote: LICENCE_NOTE,
				surface: 'ink',
				spacing: 'ample'
			}
		},
		{
			type: 'cta',
			data: {
				title: 'Co-fondez le projet à nos côtés',
				intro:
					"L'institut est ouvert à toutes celles et ceux souhaitant démocratiser l'information.",
				buttons: [
					{ label: "Adhérer à l'association", href: LINKS.helloasso.href, variant: 'primary' },
					{ label: 'Rejoindre le Discord', href: LINKS.discord.href, variant: 'outline' },
					{ label: 'Nous écrire', href: `mailto:${SITE.email}`, variant: 'ghost' }
				],
				surface: 'brand',
				spacing: 'ample'
			}
		}
	]
};
