/**
 * Contrat du registre des natures de media.
 *
 * Ajouter une nature = ajouter un fichier qui exporte un `MediaType` et
 * l enregistrer dans `index.ts`. Les champs propres a la nature vivent dans la
 * colonne `data`, validee ici : aucune colonne ne s ajoute en base
 * (AGENTS.md section 2).
 */

export type MediaKind = 'ARTICLE' | 'VIDEO' | 'PODCAST' | 'PRESS';

export type MediaDataResult =
	| { readonly ok: true; readonly data: Record<string, unknown> }
	| { readonly ok: false; readonly reason: string };

/** Un champ a saisir au back-office pour cette nature de media. */
export interface MediaField {
	readonly name: string;
	readonly label: string;
	readonly help?: string;
	readonly type: 'text' | 'url' | 'number' | 'textarea';
	readonly required: boolean;
}

export interface MediaType {
	/** Valeur stockee dans `MediaItem.kind`. Contrat : jamais renommee. */
	readonly key: MediaKind;
	readonly label: string;
	readonly plural: string;
	readonly description: string;

	/** Le media porte-t-il un corps redige chez nous ? */
	readonly hasBody: boolean;

	/**
	 * Le media renvoie-t-il ailleurs ?
	 *
	 * Une reprise de presse n a d interet que par son lien sortant ; un article
	 * redige ici n en a pas besoin. Le back-office s en sert pour exiger le champ.
	 */
	readonly isOutbound: boolean;

	/** Champs propres a la nature, affiches dans le formulaire de redaction. */
	readonly fields: readonly MediaField[];

	/** Valide et normalise le contenu de la colonne `data`. */
	parseData(raw: unknown): MediaDataResult;
}

/** Un enregistrement tel que le consomment les pages publiques. */
export interface MediaRecord {
	readonly slug: string;
	readonly kind: MediaKind;
	readonly title: string;
	readonly excerpt: string | null;
	readonly body: string | null;
	readonly coverUrl: string | null;
	readonly coverAlt: string | null;
	readonly publishedAt: Date | null;
	readonly tags: readonly string[];
	readonly data: Readonly<Record<string, unknown>>;
	readonly authorName: string | null;
}

/** Lit une chaine non vide dans un objet de donnees libre. */
export function readString(raw: unknown, key: string): string | null {
	if (typeof raw !== 'object' || raw === null) return null;
	const value = (raw as Record<string, unknown>)[key];
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed === '' ? null : trimmed;
}

/** Lit un entier positif dans un objet de donnees libre. */
export function readPositiveInt(raw: unknown, key: string): number | null {
	if (typeof raw !== 'object' || raw === null) return null;
	const value = (raw as Record<string, unknown>)[key];
	const parsed = typeof value === 'number' ? value : Number(value);
	if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) return null;
	return parsed;
}

/** Duree en minutes et secondes, telle qu on la lit sur un lecteur. */
export function formatDuration(seconds: number | null): string {
	if (seconds === null || seconds <= 0) return '';

	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);

	if (hours > 0) return `${hours} h ${String(minutes).padStart(2, '0')}`;
	return `${minutes} min`;
}
