/**
 * La modalite « Autre » d'Openforms.
 *
 * Quand un champ autorise une reponse libre, Openforms ne soumet pas le texte
 * a la place de la valeur : il soumet `__other__`, ou `__other__:le texte
 * saisi`. Aucune modalite declaree ne porte cette valeur, et la reprise la
 * refusait donc — une ligne etant acceptee ou rejetee EN ENTIER, un repondant
 * disparaissait du jeu de donnees pour une seule case. Sur la premiere enquete,
 * cela representait une quarantaine de personnes sur mille.
 *
 * Deux decisions, et la seconde n'est pas negociable.
 *
 * 1. La reponse devient la modalite « Autre ». Le repondant a bien repondu
 *    quelque chose ; le compter en non-reponse effacerait ce fait, et le
 *    rejeter effacerait la personne.
 * 2. LE TEXTE LIBRE EST JETE, ici, avant d'atteindre la base. « Natacha
 *    Polony » se range en « Autre » ; le verbatim, lui, n'entre pas. Un texte
 *    libre identifie son auteur par son contenu (AGENTS.md section 4), et il
 *    n'a de toute facon aucune place dans un croisement.
 */

/** Ce qu'Openforms soumet quand « Autre » est coche. */
export const OTHER_VALUE_PREFIX = '__other__';

/**
 * Code de la modalite qui la recoit.
 *
 * Une valeur declaree qui vaudrait deja `autre` se confond avec elle, et c'est
 * la lecture voulue : deux facons d'ecrire la meme reponse.
 */
export const OTHER_MODALITY_CODE = 'autre';

export const OTHER_MODALITY_LABEL = 'Autre';

/** Vrai pour `__other__` comme pour `__other__:un texte`. */
export function isOtherValue(value: string): boolean {
	return value === OTHER_VALUE_PREFIX || value.startsWith(`${OTHER_VALUE_PREFIX}:`);
}

/**
 * Remplace une valeur « Autre » par son code de modalite, texte libre compris.
 *
 * Toute autre valeur ressort inchangee : cette fonction n'est pas un filtre de
 * nettoyage, c'est la traduction d'une convention d'Openforms et rien de plus.
 */
export function collapseOther(value: string): string {
	return isOtherValue(value) ? OTHER_MODALITY_CODE : value;
}
