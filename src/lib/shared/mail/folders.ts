/**
 * Les vues de la messagerie et ce que chacune montre.
 *
 * Quatre sont des dossiers (un fil est dans un seul a la fois), deux sont des
 * filtres : « Suivis » montre les fils marques d'une etoile, « Envoyes » ceux
 * ou l'equipe a ecrit, et un fil suivi ou envoye reste dans son dossier. C'est
 * le fonctionnement d'une messagerie courante, et c'est ce qu'on attend.
 *
 * Les cles sont en ASCII : elles vont dans l'adresse (`?dossier=envoyes`).
 */

export type MailFolderKey = 'INBOX' | 'ARCHIVE' | 'SPAM' | 'TRASH';

export interface FolderView {
	readonly key: string;
	readonly label: string;
	/** Ce que la liste affiche quand la vue est vide. */
	readonly empty: string;
}

export const FOLDER_VIEWS = [
	{
		key: 'reception',
		label: 'Boîte de réception',
		empty: 'Aucun message en attente. Le courrier reçu arrivera ici.'
	},
	{
		key: 'suivis',
		label: 'Suivis',
		empty: 'Aucun fil suivi. Marquez un fil d’une étoile pour le retrouver ici.'
	},
	{ key: 'envoyes', label: 'Envoyés', empty: 'Aucun message envoyé depuis cette boîte.' },
	{ key: 'archives', label: 'Archives', empty: 'Aucun fil archivé.' },
	{ key: 'indesirables', label: 'Indésirables', empty: 'Aucun courriel indésirable.' },
	{ key: 'corbeille', label: 'Corbeille', empty: 'La corbeille est vide.' }
] as const satisfies readonly FolderView[];

export type FolderViewKey = (typeof FOLDER_VIEWS)[number]['key'];

export const DEFAULT_VIEW: FolderViewKey = 'reception';

export function folderView(raw: string | null): (typeof FOLDER_VIEWS)[number] {
	return FOLDER_VIEWS.find((view) => view.key === raw) ?? FOLDER_VIEWS[0];
}

/** Le filtre Prisma d'une vue, sans la boite ni la recherche. */
export function viewFilter(key: FolderViewKey): {
	folder?: MailFolderKey | { notIn: MailFolderKey[] };
	starred?: boolean;
	hasOutbound?: boolean;
} {
	switch (key) {
		case 'reception':
			return { folder: 'INBOX' };
		case 'suivis':
			return { starred: true, folder: { notIn: ['TRASH', 'SPAM'] } };
		case 'envoyes':
			return { hasOutbound: true, folder: { notIn: ['TRASH', 'SPAM'] } };
		case 'archives':
			return { folder: 'ARCHIVE' };
		case 'indesirables':
			return { folder: 'SPAM' };
		case 'corbeille':
			return { folder: 'TRASH' };
	}
}

/** Les deplacements proposes sur un fil, et le dossier d'arrivee. */
export const MOVES: Readonly<Record<string, MailFolderKey>> = {
	archiver: 'ARCHIVE',
	reception: 'INBOX',
	indesirable: 'SPAM',
	corbeille: 'TRASH'
};

export function moveTarget(raw: string): MailFolderKey | null {
	return MOVES[raw] ?? null;
}

/** Les marques qu'une action groupee pose sur un fil. */
const FLAGS: Readonly<Record<string, { readonly unread?: boolean; readonly starred?: boolean }>> = {
	lu: { unread: false },
	nonlu: { unread: true },
	suivre: { starred: true },
	nepassuivre: { starred: false }
};

/** La mise a jour d'une action groupee : un deplacement ou une marque, ou `null` si inconnue. */
export function bulkUpdate(
	op: string
): { folder: MailFolderKey } | { unread?: boolean; starred?: boolean } | null {
	const target = moveTarget(op);
	if (target) return { folder: target };
	return FLAGS[op] ?? null;
}
