import { isEmptyDoc, parseRichText, type RichTextDoc } from './richtext';

/**
 * Les champs qu'un type de section declare, et la lecture de leurs valeurs.
 *
 * Un type de section ne decrit QUE ses champs. Il ne sait pas les afficher au
 * back-office, ni les lire dans un formulaire, ni les valider : tout cela vit
 * ici, une fois. C'est ce qui permet d'ajouter une section en un fichier sans
 * toucher a l'editeur (AGENTS.md § 2).
 *
 * Quatre familles de champs seulement, et chacune existe parce qu'une section
 * reelle du site en a besoin :
 *
 * - les champs simples (texte, nombre, texte enrichi) portent la copie ;
 * - `image` porte une photographie ET sa description : les separer laisserait
 *   publier une image sans texte alternatif, ce que le site s'interdit ;
 * - `choice` porte les variantes de mise en page, celles qui changent le
 *   rendu sans changer le contenu (surface, colonnes, alignement) ;
 * - `list` porte les series : les quatre questions, les cinq engagements, les
 *   lignes d'un tableau. Sans elle, chaque serie deviendrait « element 1 »,
 *   « element 2 »… en champs plats, et ajouter une ligne demanderait un diff.
 */

export interface ChoiceOption {
	readonly value: string;
	readonly label: string;
}

interface FieldCommon {
	readonly name: string;
	readonly label: string;
	readonly help?: string;
	readonly required: boolean;
}

export type SimpleFieldType = 'text' | 'textarea' | 'url' | 'number' | 'richtext';

export type ContentField =
	| (FieldCommon & { readonly type: SimpleFieldType })
	| (FieldCommon & { readonly type: 'image' })
	| (FieldCommon & {
			readonly type: 'choice';
			readonly options: readonly ChoiceOption[];
			/** Valeur servie quand rien n'est choisi. Toujours l'une des options. */
			readonly fallback: string;
	  })
	| (FieldCommon & {
			readonly type: 'list';
			/** Au singulier : « une question », « un engagement ». Sert aux boutons. */
			readonly itemLabel: string;
			readonly item: readonly ContentField[];
			/** Plafond impose par la mise en page, quand elle en a un. */
			readonly max?: number;
	  });

export type ContentDataResult =
	| { readonly ok: true; readonly data: Record<string, unknown> }
	| { readonly ok: false; readonly reason: string };

/** Une image telle qu'elle est stockee et rendue. */
export interface ContentImage {
	readonly src: string;
	readonly alt: string;
	/** Dimensions natives, qui reservent la place avant chargement. */
	readonly width?: number;
	readonly height?: number;
}

// --- Lecture -----------------------------------------------------------------

function record(raw: unknown): Record<string, unknown> | null {
	return typeof raw === 'object' && raw !== null && !Array.isArray(raw)
		? (raw as Record<string, unknown>)
		: null;
}

/** Lit une chaine non vide dans un objet de donnees libre. */
export function readString(raw: unknown, key: string): string | null {
	const value = record(raw)?.[key];
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed === '' ? null : trimmed;
}

export function readNumber(raw: unknown, key: string): number | null {
	const value = record(raw)?.[key];
	if (typeof value === 'number') return Number.isFinite(value) ? value : null;
	if (typeof value !== 'string' || value.trim() === '') return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

export function readDoc(raw: unknown, key: string): RichTextDoc {
	return parseRichText(record(raw)?.[key]);
}

/**
 * Lit une variante de mise en page.
 *
 * Une valeur inconnue — un ancien nom de variante, une donnee forgee — retombe
 * sur le repli plutot que de produire une classe CSS vide : une section garde
 * toujours une mise en page valide.
 */
export function readChoice(raw: unknown, key: string, options: Record<string, string>): string {
	const value = readString(raw, key);
	return value !== null && value in options ? value : Object.keys(options)[0]!;
}

export function readImage(raw: unknown, key: string): ContentImage | null {
	const value = record(raw)?.[key];
	const src = readString(value, 'src');
	if (src === null) return null;

	const width = readNumber(value, 'width');
	const height = readNumber(value, 'height');

	return {
		src,
		alt: readString(value, 'alt') ?? '',
		...(width === null ? {} : { width }),
		...(height === null ? {} : { height })
	};
}

/** Lit une serie. Une valeur qui n'est pas une liste rend une liste vide. */
export function readList(raw: unknown, key: string): readonly Record<string, unknown>[] {
	const value = record(raw)?.[key];
	if (!Array.isArray(value)) return [];
	return value.filter((item): item is Record<string, unknown> => record(item) !== null);
}

// --- Validation --------------------------------------------------------------

/**
 * Adresse d'image acceptee.
 *
 * Un chemin du site (`/photos/…`, `/televersements/…`) ou une adresse http(s).
 * Ni `javascript:`, ni `data:` : le back-office n'a pas a pouvoir poser une
 * charge utile dans un attribut `src`, meme depuis un compte compromis.
 */
export function safeImageSrc(raw: string): string | null {
	const value = raw.trim();
	if (value === '') return null;
	if (value.startsWith('/') && !value.startsWith('//')) return value;

	try {
		const url = new URL(value);
		return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
	} catch {
		return null;
	}
}

function missing(field: ContentField): ContentDataResult {
	return { ok: false, reason: `Le champ « ${field.label} » est obligatoire.` };
}

function parseSimple(field: ContentField & { type: SimpleFieldType }, raw: unknown) {
	const value = readString(raw, field.name);

	if (field.type === 'richtext') {
		const doc = parseRichText(record(raw)?.[field.name]);
		// Une mise en forme sans texte reste un champ vide : un document dont tous
		// les fragments ont ete ecartes ne remplit pas un champ obligatoire.
		if (isEmptyDoc(doc)) return field.required ? missing(field) : { ok: true as const, data: {} };
		return { ok: true as const, data: { [field.name]: doc } };
	}

	if (value === null) return field.required ? missing(field) : { ok: true as const, data: {} };

	if (field.type !== 'number') return { ok: true as const, data: { [field.name]: value } };

	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		return { ok: false as const, reason: `Le champ « ${field.label} » attend un nombre.` };
	}
	return { ok: true as const, data: { [field.name]: parsed } };
}

function parseImage(field: ContentField & { type: 'image' }, raw: unknown): ContentDataResult {
	const value = record(raw)?.[field.name];
	const rawSrc = readString(value, 'src');

	if (rawSrc === null) return field.required ? missing(field) : { ok: true, data: {} };

	const src = safeImageSrc(rawSrc);
	if (src === null) {
		return { ok: false, reason: `L'adresse de « ${field.label} » n'est pas une image du site.` };
	}

	const alt = readString(value, 'alt');
	// Une image sans description ne se publie pas : c'est la meme regle que pour
	// un chiffre sans libelle, appliquee a ce qui se voit.
	if (alt === null) {
		return {
			ok: false,
			reason: `Décrivez « ${field.label} » : une image sans description ne se publie pas.`
		};
	}

	const width = readNumber(value, 'width');
	const height = readNumber(value, 'height');

	return {
		ok: true,
		data: {
			[field.name]: {
				src,
				alt,
				...(width === null ? {} : { width }),
				...(height === null ? {} : { height })
			}
		}
	};
}

function parseChoice(field: ContentField & { type: 'choice' }, raw: unknown): ContentDataResult {
	const value = readString(raw, field.name);
	const known = field.options.some((option) => option.value === value);
	return { ok: true, data: { [field.name]: known ? value : field.fallback } };
}

/** Un element de liste entierement vide : c'est ainsi qu'on supprime une ligne. */
function isEmptyItem(item: unknown, fields: readonly ContentField[]): boolean {
	return fields.every((field) => {
		if (field.type === 'image') return readString(record(item)?.[field.name], 'src') === null;
		if (field.type === 'choice') return true;
		if (field.type === 'list') return readList(item, field.name).length === 0;
		if (field.type === 'richtext') return isEmptyDoc(parseRichText(record(item)?.[field.name]));
		return readString(item, field.name) === null;
	});
}

function parseList(field: ContentField & { type: 'list' }, raw: unknown): ContentDataResult {
	const items = readList(raw, field.name).filter((item) => !isEmptyItem(item, field.item));

	if (items.length === 0) return field.required ? missing(field) : { ok: true, data: {} };
	if (field.max !== undefined && items.length > field.max) {
		return {
			ok: false,
			reason: `« ${field.label} » n'accepte que ${field.max} éléments dans cette mise en page.`
		};
	}

	const parsed: Record<string, unknown>[] = [];
	for (const [index, item] of items.entries()) {
		const result = parseDeclaredFields(field.item, item);
		// Le rang affiche est celui que l'editeur montre, pas l'index du tableau :
		// « l'élément 0 » ne designe rien pour la personne qui corrige sa saisie.
		if (!result.ok) return { ok: false, reason: `${field.label}, élément ${index + 1} : ${result.reason}` };
		parsed.push(result.data);
	}

	return { ok: true, data: { [field.name]: parsed } };
}

/**
 * Valide les champs declares par un type de section.
 *
 * Un champ obligatoire vide refuse l'enregistrement, il n'est jamais
 * silencieusement remplace par une valeur par defaut. Un champ facultatif vide
 * est omis plutot que stocke a vide : `data` ne garde que ce qui a ete saisi.
 */
export function parseDeclaredFields(
	fields: readonly ContentField[],
	raw: unknown
): ContentDataResult {
	const data: Record<string, unknown> = {};

	for (const field of fields) {
		const result = parseField(field, raw);
		if (!result.ok) return result;
		Object.assign(data, result.data);
	}

	return { ok: true, data };
}

function parseField(field: ContentField, raw: unknown): ContentDataResult {
	if (field.type === 'image') return parseImage(field, raw);
	if (field.type === 'choice') return parseChoice(field, raw);
	if (field.type === 'list') return parseList(field, raw);
	return parseSimple(field, raw);
}
