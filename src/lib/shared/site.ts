/**
 * Identite de l association et liens sortants.
 *
 * Source unique : ces valeurs alimentent les mentions legales, le pied de page,
 * les metadonnees Open Graph et les appels au don. Les recopier ailleurs, c est
 * garantir qu elles divergeront.
 */

export const SITE = {
	name: 'Humanitour',
	tagline: "L'institut de sondage citoyen",
	description:
		'Un institut de sondage citoyen : 5 000 kilometres a velo, des entretiens en face-a-face, et la totalite des donnees brutes publiees.',
	email: 'contact@humanitour.fr',
	domain: 'humanitour.fr'
} as const;

/** Association declaree. Valeurs reprises des mentions legales publiees. */
export const ORGANISATION = {
	legalName: 'HUMANITOUR',
	form: 'Association declaree regie par la loi du 1er juillet 1901',
	rna: 'W224012149',
	address: '9 lieu-dit Kersaint, 22120 Hillion, France',
	declaration:
		"Declaree a la prefecture des Cotes-d'Armor le 23 aout 2026, recepisse n° W224012149 delivre le 7 septembre 2026",
	publicationDirector: 'Elouan Passereau'
} as const;

export const HOST = {
	name: 'Contabo GmbH',
	address: 'Aschauer Strasse 32a, 81549 Munich, Allemagne',
	phone: '+49 89 3564717 70',
	website: 'https://contabo.com',
	dataCenter: 'Nuremberg, Allemagne (Union europeenne)'
} as const;

export const POLLING = {
	code: "code international ICC/ESOMAR des etudes de marche, d'opinion et sociales",
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
		description: "Rejoins la communaute et suis le tour en direct."
	},
	// TODO confirmer l URL exacte de la campagne avant mise en production.
	helloasso: {
		label: 'HelloAsso',
		href: 'https://www.helloasso.com/associations/humanitour',
		description: "Soutiens le projet et adhere a l'association."
	},
	forms: {
		label: 'Repondre au sondage',
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
	{ slug: 'mentions-legales', label: 'Mentions legales', short: 'Mentions legales' },
	{ slug: 'cgu', label: "Conditions generales d'utilisation", short: 'CGU' },
	{ slug: 'confidentialite', label: 'Politique de confidentialite', short: 'Confidentialite' },
	{ slug: 'cookies', label: 'Gestion des cookies', short: 'Cookies' },
	{ slug: 'deontologie', label: 'Deontologie des sondages', short: 'Deontologie' }
] as const;

/** Durees de conservation annoncees, en clair, dans la politique de confidentialite. */
export const RETENTION = {
	sessionDays: 7,
	rawSurveyMonths: 24,
	inactiveAccountMonths: 24,
	methodologyYears: 5
} as const;

export const NAV = [
	{ href: '/donnees', label: 'Les donnees' },
	{ href: '/medias', label: 'Medias' },
	{ href: '/le-tour', label: 'Le tour' },
	{ href: '/methodologie', label: 'Methodologie' }
] as const;
