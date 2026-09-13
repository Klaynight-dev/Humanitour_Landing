/**
 * Contrat du registre des formats d import.
 *
 * Ajouter un format = ajouter un fichier qui exporte un `ImportFormat` et
 * l enregistrer dans `index.ts`. Le reste de la chaine d import ne connait que
 * `RowSet` et ne sait pas d ou viennent les lignes.
 */

/** Un tableau brut : des colonnes nommees, des lignes de valeurs. */
export interface RowSet {
	readonly columns: readonly string[];
	readonly rows: readonly Readonly<Record<string, unknown>>[];
}

export interface ImportFormat {
	/** Valeur stockee dans `ImportBatch.format`. */
	readonly key: string;
	readonly label: string;
	readonly extensions: readonly string[];
	readonly mimeTypes: readonly string[];
	parse(content: Uint8Array): RowSet;
}

/**
 * Motifs de colonnes directement identifiantes.
 *
 * L association collecte des opinions politiques : une donnee sensible au sens de
 * l article 9 du RGPD. Un fichier qui arrive avec une colonne « email » ou
 * « telephone » est REFUSE, pas nettoye en silence : ignorer la colonne laisserait
 * croire que l import s est bien passe, et le fichier d origine continuerait de
 * circuler (AGENTS.md section 4).
 */
const IDENTIFYING_PATTERNS: readonly RegExp[] = [
	/\b(e?[-_ ]?mail|courriel)\b/i,
	/\b(t[eé]l[eé]phone|phone|portable|mobile|gsm)\b/i,
	/\b(nom|pr[eé]nom|patronyme|lastname|firstname|fullname|surname)\b/i,
	/\b(adresse|address|rue|street)\b/i,
	/\b(ip|adresse[-_ ]?ip)\b/i,
	/\b(nir|s[eé]curit[eé][-_ ]?sociale|ssn|siret|siren)\b/i,
	/\b(iban|bic|carte[-_ ]?bancaire)\b/i,
	/\b(date[-_ ]?de[-_ ]?naissance|birth[-_ ]?date|naissance)\b/i
];

/**
 * Colonnes du fichier qui ressemblent a des donnees identifiantes.
 *
 * Volontairement prudent : une colonne « nom_de_la_commune » declenche l alerte.
 * Un faux positif coute un renommage de colonne a l operateur ; un faux negatif
 * coute une violation de donnees.
 */
export function detectIdentifyingColumns(columns: readonly string[]): readonly string[] {
	return columns.filter((column) =>
		IDENTIFYING_PATTERNS.some((pattern) => pattern.test(column))
	);
}
