import { formatCount } from '../../format';
import { LICENSES, LINKS, POLLING, RETENTION, TOUR } from '../../site';
import type { ContentTemplate } from './types';

/**
 * La methodologie, telle qu'elle a ete composee.
 *
 * Le seuil d'anonymat n'y est pas ecrit en clair : le texte cite `{seuil}`, et
 * le rendu y met la valeur REELLEMENT appliquee, lue en base. Une page qui
 * annoncerait « 5 » pendant que l'agregation en applique un autre serait pire
 * que pas de page du tout — c'est exactement le reproche d'opacite adresse aux
 * instituts.
 */

/**
 * Les cinq regles de publication.
 *
 * Chacune porte sa consequence, y compris quand elle joue contre nous : une
 * regle dont on ne montre que le benefice est un argument, pas une methode.
 */
const RULES = [
	{
		term: 'On compte, on ne pondère pas',
		body: "Aucun redressement n'est appliqué, même « pour corriger l'échantillon ». Un chiffre affiché est un comptage réel. C'est le reproche central adressé aux instituts privés : nous ne pouvions pas le formuler et le pratiquer.",
		consequence:
			"Nos résultats ne prétendent donc pas représenter la France entière. Ils représentent les personnes rencontrées, décrites telles qu'elles sont."
	},
	{
		term: 'Les non-réponses sont comptées',
		body: '« Sans opinion », refus de répondre et intention de ne pas voter sont des modalités de plein droit. Elles apparaissent dans chaque graphique et pèsent dans la base de calcul des pourcentages.',
		consequence:
			"Invisibiliser l'abstention et les non-réponses revient à falsifier l'état réel de la société. Dans notre code, la non-réponse n'est pas un cas particulier : c'est une réponse comme une autre."
	},
	{
		term: 'Les effectifs accompagnent les parts',
		body: "Chaque pourcentage voyage avec son effectif brut et sa base. Un « 62 % » calculé sur douze personnes s'affiche avec ses douze personnes.",
		consequence: "Vous pouvez juger de la solidité d'un chiffre sans nous croire sur parole."
	},
	{
		term: 'La formulation exacte est affichée',
		body: 'Le libellé posé sur le terrain apparaît avec chaque graphique, mot pour mot, sans reformulation.',
		consequence:
			"La manière de poser une question fait partie du résultat. Bourdieu appelait cela l'imposition de problématiques ; le minimum est de vous montrer la nôtre."
	},
	{
		term: 'Aucune question achetée',
		body: "L'association ne vend pas de question et n'accepte pas de commanditaire. Le financement vient des dons et des adhésions.",
		consequence: "Personne ne peut acheter la formulation qui l'arrange."
	}
];

const COLLECTE_BODY = {
	blocks: [
		{
			type: 'paragraph',
			items: [
				[
					{
						text: `Les entretiens ont été menés en face-à-face, sur la voie publique et dans les commerces, le long d'un parcours à vélo de ${formatCount(TOUR.kilometres)} kilomètres traversant les ${TOUR.regions} régions métropolitaines. Il n'y a eu ni panel, ni recrutement par courriel, ni rémunération des répondants.`
					}
				]
			]
		},
		{
			type: 'paragraph',
			items: [
				[
					{
						text: "Cette méthode a ses limites, et nous les énonçons : rencontrer les gens dehors surreprésente celles et ceux qui sortent, et un parcours à vélo suit des routes, pas une carte de la population. Chaque enquête publie sa propre note de méthodologie avec ses limites connues."
					}
				]
			]
		},
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

const REUTILISATION_BODY = {
	blocks: [
		{
			type: 'paragraph',
			items: [
				[
					{ text: 'Les données publiées sont sous ' },
					{ text: LICENSES.data.name, href: LICENSES.data.url },
					{ text: " : réutilisation libre, attribution obligatoire, partage à l'identique." }
				]
			]
		},
		{
			type: 'paragraph',
			items: [
				[
					{ text: 'La plateforme elle-même est sous ' },
					{ text: LICENSES.code.name, href: LICENSES.code.url },
					{
						text: '. Quiconque en héberge une version modifiée doit en publier le code : un outil qui dénonce l’opacité ne peut pas être refermable.'
					}
				]
			]
		}
	]
};

export const methodTemplate: ContentTemplate = {
	key: 'METHOD',
	blocks: [
		{
			type: 'cover',
			data: {
				title: 'Comment nous mesurons, et ce que nous ne faisons pas',
				intro:
					"Reprocher l'opacité aux autres oblige à une contrainte simple : tout ce qui suit doit être vérifiable. Ces règles ne sont pas des intentions, ce sont des contraintes écrites dans un code public.",
				fullHeight: 'contenu',
				decor: 'aucun',
				surface: 'paper',
				spacing: 'normal'
			}
		},
		{
			type: 'definitions',
			data: {
				title: 'Nos règles',
				items: RULES,
				layout: 'large',
				surface: 'paper',
				spacing: 'compact'
			}
		},
		{
			type: 'text',
			data: {
				title: 'La collecte',
				body: COLLECTE_BODY,
				layout: 'encadre',
				surface: 'cream',
				spacing: 'compact'
			}
		},
		{
			type: 'text',
			data: {
				title: 'Pourquoi certaines cases sont masquées',
				body: "Une opinion politique est une donnée sensible au sens du RGPD. Croiser une région, une tranche d'âge, une profession et une intention de vote peut suffire à reconnaître quelqu'un dans une petite commune. Deux protections s'appliquent donc.",
				items: [
					{
						term: "Le seuil d'effectif",
						body: 'Toute case portant sur moins de {seuil} répondants n’est pas publiée. Elle s’affiche comme « effectif insuffisant » au lieu du chiffre.'
					},
					{
						term: 'La protection contre la soustraction',
						body: "Masquer une seule case ne sert à rien : elle se retrouve en soustrayant les autres du total. Quand c'est le cas, une seconde case est masquée. Sans cette deuxième passe, le masquage donne l'illusion de la protection."
					}
				],
				note: 'Les exports bruts suivent la même logique : ils contiennent les tranches et non les valeurs exactes, et les réponses en texte libre en sont exclues, parce qu’un verbatim identifie son auteur par son contenu.',
				layout: 'encadre',
				surface: 'ink',
				spacing: 'compact'
			}
		},
		{
			type: 'split',
			data: {
				title: 'Réutilisation',
				body: REUTILISATION_BODY,
				buttons: [
					{ label: 'Voir les données', href: '/donnees', variant: 'primary' },
					{ label: 'Auditer le code', href: LINKS.repository.href, variant: 'outline' }
				],
				aside: 'liste',
				asideSide: 'gauche',
				itemsTitle: 'Conservation',
				itemsLayout: 'bord-a-bord',
				items: [
					{ term: "Réponses brutes d'enquête", value: `${RETENTION.rawSurveyMonths} mois` },
					{ term: 'Notes de méthodologie', value: `${RETENTION.methodologyYears} ans` },
					{ term: 'Sessions de connexion', value: `${RETENTION.sessionDays} jours` },
					{ term: 'Comptes inactifs', value: `${RETENTION.inactiveAccountMonths} mois` }
				],
				surface: 'paper',
				spacing: 'ample'
			}
		}
	]
};
