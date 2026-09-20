import type { ContentPageKey } from '../types';

/**
 * Le modele d'origine d'une page : son contenu actuel, section par section.
 *
 * C'est la version de reference du site, celle qui a ete ecrite, relue et
 * composee. Elle sert a deux moments :
 *
 * 1. a l'installation, pour remplir la base avec le site tel qu'il est, au
 *    lieu d'ouvrir le back-office sur une page blanche ;
 * 2. a n'importe quel moment ensuite, pour reappliquer le modele a une page
 *    qu'on a videe ou abimee.
 *
 * C'est ce second point qui rend l'edition sans danger. La base est la source
 * de ce que le site affiche — supprimer une section la fait disparaitre pour
 * de bon — mais rien n'est jamais perdu : le modele reste dans le depot, et
 * une page se remet d'aplomb en un clic.
 *
 * Les donnees sont volontairement ecrites comme une saisie de back-office :
 * elles passent par `parseData` avant d'atteindre la base, exactement comme un
 * formulaire. Un modele qui ne passerait pas la validation est un bogue, et
 * `templates.test.ts` le fait echouer avant la mise en ligne.
 */

export interface ContentTemplateBlock {
	/** Cle du registre des sections. */
	readonly type: string;
	readonly data: Readonly<Record<string, unknown>>;
}

export interface ContentTemplate {
	readonly key: ContentPageKey;
	readonly blocks: readonly ContentTemplateBlock[];
}

/**
 * L'espace fine insecable, separateur de milliers francais (U+202F).
 *
 * Nommee plutot que posee en clair dans les chaines : dans Bowlby One, une
 * espace ordinaire creuse un trou visible au milieu d'un millier, et une
 * espace insecable large en creuse un autre. Ecrite en toutes lettres, on voit
 * qu'elle est la ; collee en caractere invisible, personne ne saurait dire
 * laquelle des trois espaces se trouve dans le fichier.
 */
export const FINE = ' ';
