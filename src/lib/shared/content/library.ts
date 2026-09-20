/**
 * La bibliotheque d'images du back-office.
 *
 * Decrite ici et non cote serveur parce que l'editeur l'affiche : un type qui
 * traverse la frontiere vit du cote isomorphe, sans quoi un composant finirait
 * par importer un module serveur pour une simple forme de donnees.
 */

export interface LibraryImage {
	readonly src: string;
	/** Description deja ecrite, quand la source en a une. */
	readonly alt: string;
	/** Dimensions natives, qui reservent la place de l'image avant son arrivee. */
	readonly width?: number;
	readonly height?: number;
}

export interface LibraryGroup {
	readonly label: string;
	readonly images: readonly LibraryImage[];
}
