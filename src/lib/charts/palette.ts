/**
 * Couleurs des graphiques.
 *
 * Palette VALIDEE, pas choisie a l oeil. Verifiee avec le validateur de la
 * methode de dataviz sur la surface papier (#FFFFFF), en paires adjacentes :
 *
 *   Bande de clarte      PASS  — les 8 dans L 0.43–0.77
 *   Plancher de chroma   PASS  — les 8 >= 0.1
 *   Separation daltonien PASS  — pire paire #eda100/#1baf7a dE 9.1 (protan)
 *   Vision normale       PASS  — pire paire #e87ba4/#eda100 dE 19.6
 *   Contraste / surface  WARN  — 3 teintes sous 3:1, d ou la regle ci-dessous
 *
 * Le WARN de contraste impose une compensation, appliquee partout : chaque
 * modalite porte son libelle et son effectif en toutes lettres, et un tableau de
 * donnees accompagne chaque graphique. La couleur n est jamais le seul porteur
 * d information.
 */

/**
 * Slots categoriels, dans un ORDRE FIXE.
 *
 * L ordre ne tourne pas : une modalite garde sa couleur quels que soient les
 * filtres appliques. Filtrer une region ne doit pas repeindre les autres, sinon
 * deux captures du meme sondage ne se comparent plus.
 *
 * Le corail de la marque occupe le premier slot ; il remplace le rouge de la
 * palette de reference, dont il etait trop proche. Les autres adjacences sont
 * celles de la palette de reference, deja validees.
 */
export const CATEGORICAL: readonly string[] = [
	'#FF5757', // corail — couleur de marque
	'#2a78d6', // bleu
	'#eb6834', // orange
	'#1baf7a', // aqua
	'#eda100', // jaune
	'#e87ba4', // magenta
	'#008300', // vert
	'#4a3aa7' // violet
];

/**
 * Plafond pour les formes ou toutes les paires se cotoient : carte categorielle,
 * nuage de points, petits multiples.
 *
 * Le corail et l orange ne se distinguent pas l un de l autre hors adjacence
 * (dE 2.9 en deuteranopie, 6.3 en vision normale). Au-dela de trois series sur
 * ces formes, on regroupe en « Autre » ou on separe en plusieurs graphiques.
 */
export const ALL_PAIRS_SAFE: readonly string[] = ['#FF5757', '#2a78d6', '#1baf7a'];
export const ALL_PAIRS_MAX = 3;

/**
 * Couleur de la non-reponse.
 *
 * Un gris neutre, reserve, jamais attribue a une modalite ordinaire. La
 * non-reponse est comptee comme les autres — c est la regle du projet — mais
 * elle n est pas une opinion : lui donner une teinte de la palette la ferait lire
 * comme un camp de plus.
 */
export const NON_RESPONSE_COLOR = '#9a9a9a';

/** Couleur d une case masquee par le seuil d anonymat. */
export const SUPPRESSED_COLOR = '#d9d9d9';

/**
 * Rampe sequentielle, teinte unique, du clair au fonce.
 *
 * Sert a la magnitude : carte choroplethe, intensite d une case de tableau
 * croise. Une seule teinte, jamais un arc-en-ciel — la clarte doit se lire comme
 * une quantite.
 */
export const SEQUENTIAL: readonly string[] = [
	'#fff1f1',
	'#ffdede',
	'#ffbfbf',
	'#ff9a9a',
	'#FF5757',
	'#ed3b3b',
	'#c52727'
];

/**
 * Couleur d une modalite.
 *
 * Trois regles, dans cet ordre :
 *   1. la non-reponse a sa couleur reservee ;
 *   2. une couleur imposee en base gagne — c est ce qui permet de respecter les
 *      couleurs conventionnelles des nuances politiques, que le lecteur attend ;
 *   3. sinon, le slot categoriel correspondant a la position.
 *
 * Au-dela de huit modalites les couleurs se repeteraient : `colorAt` ne cycle pas
 * silencieusement, il rend le gris de repli. Une question a plus de huit
 * modalites doit etre regroupee, pas coloriee au hasard.
 */
export function colorFor(
	index: number,
	options: { isNonResponse?: boolean; override?: string | null } = {}
): string {
	if (options.isNonResponse) return NON_RESPONSE_COLOR;
	if (options.override) return options.override;
	return CATEGORICAL[index] ?? NON_RESPONSE_COLOR;
}

/** Vrai si le nombre de modalites depasse ce que la palette peut distinguer. */
export function exceedsPalette(count: number): boolean {
	return count > CATEGORICAL.length;
}

/** Etape de la rampe sequentielle pour une valeur entre 0 et 1. */
export function sequentialStep(ratio: number): string {
	if (!Number.isFinite(ratio) || ratio <= 0) return SEQUENTIAL[0]!;
	const index = Math.min(SEQUENTIAL.length - 1, Math.floor(ratio * SEQUENTIAL.length));
	return SEQUENTIAL[index]!;
}
