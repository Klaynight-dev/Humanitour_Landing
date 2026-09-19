/**
 * Lecture des champs de formulaire.
 *
 * `FormData` rend `FormDataEntryValue | null` : sans ces fonctions, chaque
 * action du back-office recopie le meme `String(form.get(x) ?? '').trim()`, et
 * l'une d'elles finit par oublier le `trim` ou le repli.
 */

/** Texte obligatoire, chaine vide si absent. */
export function readText(form: FormData, name: string): string {
	return String(form.get(name) ?? '').trim();
}

/** Texte optionnel : une chaine vide vaut « non renseigne ». */
export function readOptionalText(form: FormData, name: string): string | null {
	const value = readText(form, name);
	return value === '' ? null : value;
}

/** Case a cocher. Un navigateur n'envoie rien quand elle est decochee. */
export function readCheckbox(form: FormData, name: string): boolean {
	return form.get(name) === 'on' || form.get(name) === 'true';
}

/** Date de formulaire. Une valeur illisible vaut « non renseignee ». */
export function readDate(form: FormData, name: string): Date | null {
	const raw = readText(form, name);
	if (raw === '') return null;

	const date = new Date(raw);
	return Number.isNaN(date.getTime()) ? null : date;
}

export type IntResult =
	| { readonly ok: true; readonly value: number | null }
	| { readonly ok: false; readonly reason: string };

/**
 * Entier optionnel, avec borne basse.
 *
 * Rend une erreur explicite plutot que `null` sur une saisie invalide : pour le
 * seuil d'anonymat, confondre « vide » et « zero » leverait la protection.
 */
export function readOptionalInt(form: FormData, name: string, min = 1): IntResult {
	const raw = readText(form, name);
	if (raw === '') return { ok: true, value: null };

	const value = Number(raw);
	if (!Number.isInteger(value) || value < min) {
		return { ok: false, reason: `La valeur doit etre un entier superieur ou egal a ${min}.` };
	}

	return { ok: true, value };
}

/** Couleur hexadecimale, ou `null` si la saisie n'en est pas une. */
export function readHexColor(form: FormData, name: string): string | null {
	const value = readText(form, name);
	return /^#[0-9a-fA-F]{6}$/.test(value) ? value : null;
}

/**
 * Collecte les champs prefixes, par exemple `map:priorite`.
 *
 * Sert aux formulaires dont le nombre de champs depend des donnees : la
 * correspondance de colonnes d'un import en compte autant que de questions.
 */
export function readPrefixed(form: FormData, prefix: string): Record<string, string> {
	const collected: Record<string, string> = {};

	for (const [key, value] of form.entries()) {
		if (!key.startsWith(prefix)) continue;

		const text = String(value).trim();
		if (text !== '') collected[key.slice(prefix.length)] = text;
	}

	return collected;
}

/**
 * Liste de mots-cles saisie en une ligne, separee par des virgules.
 *
 * Normalise a la lecture : espaces rognes, doublons ecartes, casse conservee.
 * Sans cette normalisation, « Logement », « logement » et « logement  »
 * deviendraient trois themes distincts dans le catalogue, et le filtre en
 * raterait deux sur trois.
 */
export function readKeywords(form: FormData, name: string): string[] {
	const seen = new Set<string>();
	const keywords: string[] = [];

	for (const raw of readText(form, name).split(',')) {
		const keyword = raw.trim();
		const key = keyword.toLocaleLowerCase('fr-FR');
		if (keyword === '' || seen.has(key)) continue;

		seen.add(key);
		keywords.push(keyword);
	}

	return keywords;
}
