/**
 * Detection des colonnes directement identifiantes.
 *
 * Openforms est le seul canal de collecte, et le registre des types de champ
 * ecarte deja les types intrinsequement identifiants (courriel, adresse,
 * signature, fichier). Ce controle-ci vise ce que le TYPE ne dit pas : un champ
 * « texte court » dont la cle est `nom` ou `telephone` est un champ identifiant
 * qu'aucune verification de type ne rattraperait.
 *
 * Il est donc la deuxieme ligne, pas la premiere, et il refuse la
 * synchronisation entiere plutot que de retirer la colonne en silence : ignorer
 * la colonne laisserait croire que tout s'est bien passe, et le formulaire
 * continuerait de recueillir la donnee chez Openforms (AGENTS.md section 4).
 */

/** Un tableau brut : des colonnes nommees, des lignes de valeurs. */
export interface RowSet {
	readonly columns: readonly string[];
	readonly rows: readonly Readonly<Record<string, unknown>>[];
}

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
 * Colonnes qui ressemblent a des donnees identifiantes.
 *
 * Volontairement prudent : une colonne « nom_de_la_commune » declenche
 * l'alerte. Un faux positif coute un renommage de champ chez Openforms ; un
 * faux negatif coute une violation de donnees.
 */
export function detectIdentifyingColumns(columns: readonly string[]): readonly string[] {
	return columns.filter((column) => IDENTIFYING_PATTERNS.some((pattern) => pattern.test(column)));
}
