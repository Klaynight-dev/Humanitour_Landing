/**
 * Contrat du registre des blocs de contenu.
 *
 * Ajouter un type de bloc = ajouter un fichier qui exporte un `ContentBlockType`
 * et l enregistrer dans `index.ts`. Les champs propres au type vivent dans la
 * colonne `data`, validee ici : aucune colonne ne s ajoute en base
 * (AGENTS.md section 2).
 *
 * Meme forme que le registre des natures de media, volontairement : deux
 * registres qui font la meme chose doivent se lire pareil.
 */

export type ContentPageKey = 'HOME' | 'ABOUT' | 'TOUR';

export type ContentDataResult =
	| { readonly ok: true; readonly data: Record<string, unknown> }
	| { readonly ok: false; readonly reason: string };

/** Un champ a saisir au back-office pour ce type de bloc. */
export interface ContentField {
	readonly name: string;
	readonly label: string;
	readonly help?: string;
	readonly type: 'text' | 'url' | 'number' | 'textarea';
	readonly required: boolean;
}

export interface ContentBlockType {
	/** Valeur stockee dans `ContentBlock.type`. Contrat : jamais renommee. */
	readonly key: string;
	readonly label: string;
	readonly description: string;
	readonly fields: readonly ContentField[];

	/** Valide et normalise le contenu de la colonne `data`. */
	parseData(raw: unknown): ContentDataResult;
}

/** Un bloc tel que le consomment les pages publiques. */
export interface ContentBlockRecord {
	readonly id: string;
	readonly type: string;
	readonly position: number;
	readonly data: Readonly<Record<string, unknown>>;
}

/** Lit une chaine non vide dans un objet de donnees libre. */
export function readString(raw: unknown, key: string): string | null {
	if (typeof raw !== 'object' || raw === null) return null;
	const value = (raw as Record<string, unknown>)[key];
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed === '' ? null : trimmed;
}

/**
 * Valide les champs declares par un type de bloc.
 *
 * Mutualise ici plutot que recopie dans chaque fichier : un type de bloc ne
 * decrit que ses champs, il n a pas a reimplementer « obligatoire » a chaque
 * fois. Un champ obligatoire vide refuse l enregistrement, il n est jamais
 * silencieusement remplace par une valeur par defaut.
 */
export function parseDeclaredFields(
	fields: readonly ContentField[],
	raw: unknown
): ContentDataResult {
	const data: Record<string, unknown> = {};

	for (const field of fields) {
		const value = readString(raw, field.name);

		if (value === null) {
			if (field.required) return { ok: false, reason: `Le champ « ${field.label} » est obligatoire.` };
			continue;
		}

		if (field.type !== 'number') {
			data[field.name] = value;
			continue;
		}

		const parsed = Number(value);
		if (!Number.isFinite(parsed)) {
			return { ok: false, reason: `Le champ « ${field.label} » attend un nombre.` };
		}
		data[field.name] = parsed;
	}

	return { ok: true, data };
}
