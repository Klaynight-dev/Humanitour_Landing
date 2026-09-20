/**
 * Les valeurs du site qu'un texte peut citer sans les figer.
 *
 * Certains textes annoncent une valeur que le site applique vraiment : le
 * seuil d'effectif publiable est le meilleur exemple. Le recopier en clair
 * dans la page de methodologie creerait deux verites — celle qu'on lit et
 * celle que la couche d'agregation applique — et c'est exactement le reproche
 * d'opacite que l'institut adresse aux autres.
 *
 * Un texte ecrit donc `{seuil}`, et le rendu y met la valeur du moment. Un
 * jeton inconnu reste visible tel quel : un `{seuil}` affiche sur le site
 * signale une faute de frappe, la remplacer par du vide la cacherait.
 */

export const CONTENT_TOKENS: readonly {
	readonly token: string;
	readonly label: string;
}[] = [
	{ token: '{seuil}', label: 'Le seuil d’effectif réellement appliqué aux publications' },
	{ token: '{photos}', label: 'Le nombre de photographies du tour' }
];

export type ContentTokens = Readonly<Record<string, string>>;

const PATTERN = /\{[a-z]+\}/g;

/** Remplace les jetons connus dans un texte. Les autres restent en place. */
export function applyTokens(text: string, tokens: ContentTokens): string {
	return text.replace(PATTERN, (match) => tokens[match] ?? match);
}
