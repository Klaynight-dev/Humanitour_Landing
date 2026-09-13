/**
 * Normalisation de chaines en identifiants.
 *
 * Une seule implementation, deux usages : les segments d URL publiques et la
 * mise en correspondance des colonnes d un fichier importe. Deux versions
 * divergeraient, et un jour un titre produirait un slug different de celui
 * qu attendait l import.
 */

const SEPARATOR_RUN = /[^a-z0-9]+/g;

function normalize(value: string, separator: string): string {
	return value
		// NFD puis suppression des diacritiques : « é » devient « e », pas « ? ».
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(SEPARATOR_RUN, separator)
		.replace(new RegExp(`^${separator}+|${separator}+$`, 'g'), '');
}

/**
 * Segment d URL publique.
 *
 * Fait partie du contrat de permalien : le slug d un sondage ou d un article ne
 * se renomme pas apres publication (AGENTS.md section 1.4).
 */
export function toSlug(value: string, maxLength = 80): string {
	const slug = normalize(value, '-').slice(0, maxLength).replace(/-+$/, '');
	return slug === '' ? 'sans-titre' : slug;
}

/** Cle de comparaison d un nom de colonne ou d un code de question. */
export function toColumnKey(value: string): string {
	return normalize(value, '_');
}

/**
 * Rend un slug unique au sein d une collection existante.
 *
 * Suffixe numerique plutot qu horodatage ou identifiant aleatoire : une adresse
 * doit rester lisible et previsible.
 */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
	const existing = new Set(taken);
	if (!existing.has(base)) return base;

	for (let suffix = 2; suffix < 1000; suffix += 1) {
		const candidate = `${base}-${suffix}`;
		if (!existing.has(candidate)) return candidate;
	}

	// Mille collisions sur le meme titre releve du probleme de donnees, pas du
	// cas limite a traiter en silence.
	throw new Error(`Impossible de rendre le slug « ${base} » unique.`);
}
