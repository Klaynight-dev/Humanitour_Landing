/**
 * Reagencement d'une page en cours d'edition.
 *
 * L'editeur tient la page entiere en memoire et ne l'enregistre qu'une fois :
 * monter une section, la dupliquer ou la retirer sont donc des operations sur
 * un tableau, pas des requetes. C'est ce qui rend l'edition instantanee, et
 * c'est aussi ce qui rend ces regles testables sans base.
 *
 * Toutes rendent un NOUVEAU tableau. Une mutation en place ne reveillerait pas
 * la reactivite de Svelte, et le canevas resterait sur l'ordre precedent.
 */

export interface ArrangedBlock<Data = Record<string, unknown>> {
	/**
	 * Cle de travail, stable tant que la section vit a l'ecran.
	 *
	 * Ce n'est pas l'identifiant de base : une section ajoutee ici n'existe pas
	 * encore en base, et une section dupliquee porterait sinon la cle de son
	 * original. Sans cle stable, retirer la premiere section refait tous les
	 * champs des suivantes et la saisie en cours saute.
	 */
	readonly key: number;
	readonly type: string;
	readonly data: Data;
}

/** Deplace une section d'un cran. Aux extremites, la page ne bouge pas. */
export function move<T>(blocks: readonly T[], index: number, direction: -1 | 1): T[] {
	const target = index + direction;
	if (index < 0 || index >= blocks.length) return [...blocks];
	if (target < 0 || target >= blocks.length) return [...blocks];

	const next = [...blocks];
	const held = next[index]!;
	next[index] = next[target]!;
	next[target] = held;
	return next;
}

/**
 * Deplace une section a un rang quelconque : c'est le glisser-deposer.
 *
 * `to` est lu APRES le retrait de la section deplacee, ce qui est exactement ce
 * qu'attend un depot entre deux voisines.
 */
export function moveTo<T>(blocks: readonly T[], from: number, to: number): T[] {
	if (from < 0 || from >= blocks.length) return [...blocks];
	if (to < 0 || to >= blocks.length) return [...blocks];

	const next = [...blocks];
	const [held] = next.splice(from, 1);
	if (held === undefined) return [...blocks];
	next.splice(to, 0, held);
	return next;
}

export function removeAt<T>(blocks: readonly T[], index: number): T[] {
	if (index < 0 || index >= blocks.length) return [...blocks];
	return blocks.filter((_, position) => position !== index);
}

/**
 * Insere une section juste apres `index`.
 *
 * `index` vaut `-1` pour poser en tete, et la longueur du tableau pour poser en
 * fin. Ce sont les deux bouts, pas deux cas particuliers : `splice` les traite
 * comme les autres.
 */
export function insertAfter<T>(blocks: readonly T[], index: number, block: T): T[] {
	const next = [...blocks];
	next.splice(Math.min(Math.max(index + 1, 0), next.length), 0, block);
	return next;
}
