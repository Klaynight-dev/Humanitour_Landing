import { formatCount } from '../../format';
import { LINKS, TOUR } from '../../site';
import type { ContentTemplate } from './types';

/**
 * Le tour, tel qu'il a ete compose.
 *
 * C'est la seule page dont la couverture porte du mouvement : son sujet est un
 * parcours, et le degrade anime le dit sans l'illustrer. Il se retire de
 * lui-meme quand le systeme demande moins d'animation.
 */

/** Ce que le velo a change a la methode, par rapport a un panel en ligne. */
const METHOD = [
	{
		term: 'Aucun panel, aucun courriel',
		body: "Les instituts privés recrutent en ligne, auprès de volontaires déjà inscrits et rémunérés en bons d'achat. Le vélo a imposé l'inverse : les gens ont été rencontrés là où ils vivent, sans présélection."
	},
	{
		term: 'La France entière, pas les métropoles',
		body: "Un sondage par courriel surreprésente les grandes villes connectées. Le parcours a traversé les bourgs et les zones rurales que les panels en ligne n'atteignent jamais."
	},
	{
		term: 'Des échanges documentés',
		body: "Chaque entretien a été enregistré avec l'accord de la personne, pour donner à entendre les voix derrière les pourcentages et pas seulement le chiffre final."
	}
];

export const tourTemplate: ContentTemplate = {
	key: 'TOUR',
	blocks: [
		{
			type: 'cover',
			data: {
				title: `${formatCount(TOUR.kilometres)} kilomètres à la rencontre de la France`,
				highlight: 'France',
				highlightStyle: 'ink',
				intro:
					"Un sondage ne se construit pas depuis un bureau. Celui-ci s'est construit sur la route, en s'arrêtant pour écouter, dans les treize régions métropolitaines.",
				buttons: [
					{ label: 'Voir les résultats', href: '/donnees', variant: 'primary' },
					{ label: 'Soutenir la suite', href: LINKS.helloasso.href, variant: 'outline' }
				],
				fullHeight: 'contenu',
				decor: 'mouvement',
				surface: 'mesh',
				spacing: 'normal'
			}
		},
		{
			type: 'figure-grid',
			data: {
				items: [
					{
						value: `${formatCount(TOUR.kilometres)} km`,
						label: 'À vélo',
						hint: 'À travers les régions métropolitaines'
					},
					{
						value: `${TOUR.months} mois`,
						label: 'Sur le terrain',
						hint: 'En continu, au contact des habitants'
					},
					{
						value: String(TOUR.regions),
						label: 'Régions',
						hint: 'Toutes les métropolitaines, Corse comprise'
					},
					{
						value: formatCount(TOUR.respondents),
						label: 'Personnes',
						hint: 'Rencontrées en face-à-face'
					}
				],
				columns: '4',
				style: 'affiche',
				surface: 'ink',
				spacing: 'compact'
			}
		},
		{
			type: 'definitions',
			data: {
				title: 'La méthode fait partie du résultat',
				items: METHOD,
				layout: 'large',
				shapes: 'oui',
				surface: 'cream',
				spacing: 'ample'
			}
		},
		{
			type: 'embed',
			data: {
				title: 'Treize régions, aucune laissée de côté',
				content: 'carte',
				subtitle: 'Le carnet de route, étape par étape',
				secondContent: 'carnet',
				surface: 'paper',
				spacing: 'ample'
			}
		},
		{
			type: 'split',
			data: {
				title: 'Le premier sondage-reportage',
				intro: `${TOUR.voteSharedRatio} personnes rencontrées ont accepté de partager leur vote, et ${TOUR.onCameraRatio} ont répondu face caméra. L'équipe a été hébergée chaque soir chez des habitants différents.`,
				body: 'Tous les échanges ont été enregistrés. Ils seront diffusés dans une série documentaire qui présentera l’enquête et sa méthode, entretien par entretien.',
				buttons: [{ label: 'Voir la médiathèque', href: '/medias', variant: 'outline' }],
				aside: 'manuscrit',
				asideNote: 'mille personnes,\nmille conversations',
				surface: 'cream',
				spacing: 'ample'
			}
		},
		{
			type: 'cta',
			data: {
				title: 'La suite se décide avec ses adhérents',
				intro:
					"Les résultats, les prochaines étapes et les coulisses se partagent d'abord sur le Discord de l'association.",
				buttons: [
					{ label: 'Rejoindre le Discord', href: LINKS.discord.href, variant: 'primary' },
					{ label: "Adhérer à l'association", href: LINKS.helloasso.href, variant: 'outline' }
				],
				surface: 'brand',
				spacing: 'ample'
			}
		}
	]
};
