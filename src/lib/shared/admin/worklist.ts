import { can, type Permission, type PermissionHolder } from '$lib/shared/permissions';

/**
 * Ce qui attend quelqu'un.
 *
 * Un tableau de bord qui n'affiche que des totaux se regarde une fois puis ne
 * sert plus : il dit ou on en est, jamais ce qu'il reste a faire. Ce module
 * transforme des comptages bruts en une liste d'actions, chacune menant a
 * l'ecran qui la resout.
 *
 * Il ne touche pas la base : il recoit des nombres et rend des phrases. C'est
 * ce qui le rend testable sans PostgreSQL (AGENTS.md section 3.2), et c'est
 * aussi ce qui garantit qu'aucune regle d'affichage ne se perd dans une
 * requete.
 */

/**
 * `urgent` designe ce qui est deja casse ou en retard, `todo` ce qui attend une
 * decision. L'ordre d'affichage en decoule, et rien d'autre : la couleur seule
 * ne porte jamais l'information, chaque ligne dit en toutes lettres ce qu'elle
 * est.
 */
export type WorkTone = 'urgent' | 'todo';

interface WorkKind {
	readonly tone: WorkTone;
	readonly href: string;
	readonly permission: Permission;
	/** Le libelle porte le nombre : « 1 page », « 3 pages ». */
	readonly one: string;
	readonly many: string;
	readonly detail: string;
}

/**
 * Le registre des choses a faire.
 *
 * Ajouter une alerte, c'est une entree ici et un comptage dans
 * `server/dashboard/queries.ts`. Aucun `if` ne s'ajoute a l'ecran.
 */
const WORK_KINDS = {
	'sync-failed': {
		tone: 'urgent',
		href: '/admin/sondages',
		permission: 'survey.read',
		one: 'synchronisation Openforms en échec',
		many: 'synchronisations Openforms en échec',
		detail:
			"Tant qu'elle échoue, les chiffres publiés cessent simplement de bouger sans que rien ne le signale."
	},
	'media-late': {
		tone: 'urgent',
		href: '/admin/medias',
		permission: 'media.read',
		one: 'publication programmée en retard',
		many: 'publications programmées en retard',
		detail: "Leur date est passée et elles ne sont toujours pas en ligne."
	},
	'page-unpublished': {
		tone: 'todo',
		href: '/admin/contenu',
		permission: 'content.read',
		one: 'page modifiée mais jamais publiée',
		many: 'pages modifiées mais jamais publiées',
		detail: "Le site sert encore leur modèle d'origine, pas votre version."
	},
	'survey-draft': {
		tone: 'todo',
		href: '/admin/sondages',
		permission: 'survey.read',
		one: 'sondage en brouillon',
		many: 'sondages en brouillon',
		detail: 'Ni visible sur le site, ni ouvert à la collecte.'
	},
	'media-draft': {
		tone: 'todo',
		href: '/admin/medias',
		permission: 'media.read',
		one: 'média en brouillon',
		many: 'médias en brouillon',
		detail: 'Rédigés, pas encore en ligne.'
	}
} as const satisfies Record<string, WorkKind>;

export type WorkKey = keyof typeof WORK_KINDS;

export const WORK_KEYS = Object.keys(WORK_KINDS) as WorkKey[];

/** Les comptages attendus, un par entree du registre. */
export type WorkCounts = Record<WorkKey, number>;

export interface WorkItem {
	readonly key: WorkKey;
	readonly tone: WorkTone;
	readonly count: number;
	/** « 3 pages modifiées mais jamais publiées ». */
	readonly label: string;
	readonly detail: string;
	readonly href: string;
}

export const EMPTY_COUNTS: WorkCounts = Object.fromEntries(
	WORK_KEYS.map((key) => [key, 0])
) as WorkCounts;

/**
 * Les comptages vers la liste affichee.
 *
 * Trois filtres, dans cet ordre : ce qui vaut zero n'est pas une tache, ce que
 * le compte ne peut pas ouvrir ne le regarde pas, et ce qui est casse passe
 * devant ce qui attend. A gravite egale, le plus nombreux d'abord — c'est
 * l'ordre dans lequel on voudrait les traiter.
 */
export function buildWorklist(counts: WorkCounts, holder: PermissionHolder | null): WorkItem[] {
	return WORK_KEYS.filter((key) => counts[key] > 0)
		.filter((key) => can(holder, WORK_KINDS[key].permission))
		.map((key) => {
			const kind = WORK_KINDS[key];
			const count = counts[key];
			return {
				key,
				tone: kind.tone,
				count,
				label: `${count} ${count > 1 ? kind.many : kind.one}`,
				detail: kind.detail,
				href: kind.href
			};
		})
		.sort((left, right) => {
			if (left.tone !== right.tone) return left.tone === 'urgent' ? -1 : 1;
			return right.count - left.count;
		});
}

/**
 * Variation entre deux periodes, en pourcentage entier.
 *
 * `null` quand la periode precedente est vide : afficher « +100 % » parce qu'on
 * est passe de zero a un serait un chiffre invente, et ce depot ne publie pas
 * de chiffre invente (AGENTS.md section 0).
 */
export function changeRatio(current: number, previous: number): number | null {
	if (previous === 0) return null;
	return Math.round(((current - previous) / previous) * 100);
}
