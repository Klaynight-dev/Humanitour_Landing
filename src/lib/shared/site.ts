/**
 * Identite de l association et liens sortants.
 *
 * Source unique : ces valeurs alimentent les mentions legales, le pied de page,
 * les metadonnees Open Graph et les appels au don. Les recopier ailleurs, c est
 * garantir qu elles divergeront.
 *
 * Les `slug` et les `href` restent en ASCII : ce sont des adresses, pas du
 * texte. Seuls les libelles portent les accents.
 */

export const SITE = {
	name: 'Humanitour',
	tagline: "L'institut de sondage citoyen",
	description:
		'Un institut de sondage citoyen : 5 000 kilomètres à vélo, des entretiens en face-à-face, et la totalité des données brutes publiées.',
	email: 'contact@humanitour.fr',
	domain: 'humanitour.fr'
} as const;

/** Association declaree. Valeurs reprises des mentions legales publiees. */
export const ORGANISATION = {
	legalName: 'HUMANITOUR',
	form: 'Association déclarée régie par la loi du 1er juillet 1901',
	rna: 'W224012149',
	address: '9 lieu-dit Kersaint, 22120 Hillion, France',
	declaration:
		"Déclarée à la préfecture des Côtes-d'Armor le 23 août 2026, récépissé n° W224012149 délivré le 7 septembre 2026",
	publicationDirector: 'Elouan Passereau'
} as const;

export const HOST = {
	name: 'Contabo GmbH',
	address: 'Aschauer Straße 32a, 81549 Munich, Allemagne',
	phone: '+49 89 3564717 70',
	website: 'https://contabo.com',
	dataCenter: 'Nuremberg, Allemagne (Union européenne)'
} as const;

export const POLLING = {
	code: "code international ICC/ESOMAR des études de marché, d'opinion et sociales",
	commissionUrl: 'https://www.commission-des-sondages.fr'
} as const;

export const LICENSES = {
	code: { name: 'AGPL-3.0', url: 'https://www.gnu.org/licenses/agpl-3.0.html' },
	data: { name: 'ODbL 1.0', url: 'https://opendatacommons.org/licenses/odbl/1-0/' }
} as const;

export interface ExternalLink {
	readonly label: string;
	readonly href: string;
	readonly description?: string;
}

export const LINKS = {
	discord: {
		label: 'Discord',
		href: 'https://discord.gg/qdFMQFUZ5M',
		description: 'Rejoins la communauté et suis le tour en direct.'
	},
	// TODO confirmer l URL exacte de la campagne avant mise en production.
	helloasso: {
		label: 'HelloAsso',
		href: 'https://www.helloasso.com/associations/humanitour',
		description: "Soutiens le projet et adhère à l'association."
	},
	forms: {
		label: 'Répondre au sondage',
		href: 'https://forms.humanitour.fr',
		description: 'Le formulaire de collecte.'
	},
	repository: {
		label: 'Code source',
		href: 'https://github.com/Klaynight-dev/Humanitour_Landing',
		description: 'La plateforme est libre et auditable.'
	}
} as const satisfies Record<string, ExternalLink>;

export const LEGAL_PAGES = [
	{ slug: 'mentions-legales', label: 'Mentions légales', short: 'Mentions légales' },
	{ slug: 'cgu', label: "Conditions générales d'utilisation", short: 'CGU' },
	{ slug: 'confidentialite', label: 'Politique de confidentialité', short: 'Confidentialité' },
	{ slug: 'cookies', label: 'Gestion des cookies', short: 'Cookies' },
	{ slug: 'deontologie', label: 'Déontologie des sondages', short: 'Déontologie' }
] as const;

/** Durees de conservation annoncees, en clair, dans la politique de confidentialite. */
export const RETENTION = {
	sessionDays: 7,
	rawSurveyMonths: 24,
	inactiveAccountMonths: 24,
	methodologyYears: 5
} as const;

/**
 * Navigation principale.
 *
 * Ne contient que des routes existantes : un menu qui promet une page absente
 * coute plus cher en confiance qu'une rubrique manquante.
 */
export const NAV = [
	{ href: '/le-tour', label: 'Le tour' },
	{ href: '/donnees', label: 'Les données' },
	{ href: '/medias', label: 'Médias' },
	{ href: '/methodologie', label: 'Méthodologie' }
] as const;
