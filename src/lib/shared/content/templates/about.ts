import { HOST, INCUBATOR, LICENSES, LINKS, ORGANISATION, POLLING, SITE, TOUR } from '../../site';
import { formatCount } from '../../format';
import type { ContentTemplate } from './types';
import { templateTeam } from './common';

/**
 * L'institut (ex-« A propos »), telle qu'elle a ete composee. Les textes sont
 * ceux de l'association (septembre 2026) ; l'URL `/a-propos` reste, par
 * contrat de permalien.
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

/** Vision, mission, demarche : ce que l'institut se donne pour tache. */
const PURPOSE = [
	{
		term: 'Notre mission : redonner aux citoyen·ne·s la maîtrise de leur parole',
		body: 'Concrètement, nous réinventons la pratique du sondage grâce à des enquêtes rigoureuses menées sur le terrain, sur des sujets choisis par les citoyen·ne·s. Et nous documentons nos sondages en reportages, pour diffuser la parole citoyenne et redonner aux sondages une utilité démocratique : favoriser la participation et la délibération.'
	},
	{
		term: 'Notre démarche : apartisane',
		body: "Humanitour ne défend aucun candidat. Nous sommes intransigeants sur notre indépendance : à l'inverse des autres instituts, nos questions ne sont pas décidées par les partis politiques, les médias ou l'État. Chez nous, les citoyen·ne·s sont souverain·e·s. Nous réunissons toutes les sensibilités, dans le respect de chaque être humain."
	}
];

const VALUES = [
	{
		term: 'Liberté',
		body: "Garantir aux citoyens la liberté de choisir leurs sujets d'intérêt et de s'exprimer sans filtre."
	},
	{
		term: 'Égalité',
		body: "Prendre en compte l'avis de toute la population, y compris les personnes éloignées de la politique ou réputées « sans opinion »."
	},
	{
		term: 'Humanité',
		body: 'Aller sur le terrain, au cœur de la vie des citoyen·ne·s, pour écouter et retisser des liens humains.'
	}
];

/** Le lien vers Bourdieu mene a la methodologie, qui porte sa citation. */
const SCIENCE_BODY = {
	blocks: [
		{
			type: 'paragraph',
			items: [
				[
					{
						text: "Pour garantir la qualité méthodologique et scientifique de ses travaux, Humanitour s'appuie sur la science ("
					},
					{ text: 'voir notre inspiration avec Pierre Bourdieu', href: '/methodologie' },
					{ text: ") et travaille à la création d'un Conseil scientifique." }
				]
			]
		}
	]
};

const STORY_BODY = `Humanitour est née d'un tour de l'humanité. Notre cofondateur, Côme Moudenner, entrepreneur et agent sportif, a dit non aux millions pour aller à la rencontre de l'humain. Sans argent, il a traversé l'Europe en auto-stop et à vélo et a été hébergé chez plus de 200 habitants.

Marqué par le décalage entre l'humanité du terrain et les discours à la télé, il a voulu vérifier si les sondages disaient vrai en menant une enquête de terrain avant l'élection présidentielle. ${formatCount(TOUR.kilometres)} kilomètres et ${formatCount(TOUR.respondents)} rencontres plus tard, le grand écart entre les résultats des sondages en ligne et la réalité du terrain a confirmé une urgence sociétale : créer un institut de sondage citoyen.`;

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
					{
						text: `L'association applique le ${POLLING.code}. Les sondages électoraux relèvent du contrôle de la `
					},
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
				title: 'Le premier institut de sondage citoyen et indépendant',
				highlight: 'citoyen',
				highlightStyle: 'brand',
				intro:
					"Association à but non lucratif, nous n'avons aucun milliardaire, commanditaire ni actionnaire à satisfaire. Et nos dirigeants, ce sont vous, les citoyen·ne·s adhérent·e·s !",
				buttons: [{ label: 'Nous rejoindre', href: LINKS.helloasso.href, variant: 'primary' }],
				fullHeight: 'contenu',
				decor: 'aplats',
				surface: 'cream',
				spacing: 'normal'
			}
		},
		{
			type: 'pull-quote',
			data: {
				title: 'Notre vision : chaque voix compte',
				quote: "Les sondages, c'est fait pour que les gens sachent ce qu'ils pensent.",
				author: 'Coluche',
				body: "Nous croyons qu'une démocratie vivante exige l'écoute de chacun·e et une information libre, qui appartient pleinement aux citoyen·ne·s. Nous œuvrons pour une société où le débat public repose sur une parole citoyenne éclairée, nuancée et respectée.",
				items: PURPOSE,
				surface: 'paper',
				spacing: 'ample'
			}
		},
		{
			type: 'definitions',
			data: {
				title: 'Nos valeurs : humanistes',
				highlight: 'humanistes',
				items: VALUES,
				layout: 'etroite',
				surface: 'cream',
				spacing: 'compact'
			}
		},
		{
			type: 'team',
			data: {
				title: 'Notre équipe : engagée',
				members: templateTeam(),
				layout: 'grille',
				surface: 'cream',
				spacing: 'compact'
			}
		},
		{
			type: 'text',
			data: {
				title: 'Notre projet : scientifique',
				body: SCIENCE_BODY,
				layout: 'colonne',
				surface: 'paper',
				spacing: 'compact'
			}
		},
		{
			type: 'split',
			data: {
				title: 'Notre histoire : humaine',
				figures: [
					{ value: '200', label: 'habitants qui l’ont hébergé' },
					{
						value: `${formatCount(TOUR.kilometres)} km`,
						label: 'parcourus avant la présidentielle'
					},
					{ value: formatCount(TOUR.respondents), label: 'rencontres sur le terrain' }
				],
				body: STORY_BODY,
				buttons: [{ label: 'Découvrir le tour', href: '/le-tour', variant: 'outline' }],
				aside: 'photos',
				asideLink: '/le-tour',
				surface: 'ink',
				spacing: 'ample'
			}
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
				surface: 'paper',
				spacing: 'ample'
			}
		},
		{
			type: 'cta',
			data: {
				title: 'Notre collectif : ouvert',
				intro:
					"Incubé par l'Économie sociale et solidaire (ESS), Humanitour repose sur un réseau engagé de citoyen·ne·s, chercheur·euse·s et enquêteur·rice·s de terrain. L'association invite toute personne désireuse de faire entendre sa voix, et d'écouter celle des autres, à rejoindre le mouvement.",
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
