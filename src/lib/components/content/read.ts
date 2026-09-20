import {
	readDoc,
	readImage,
	readList,
	readNumber,
	readString,
	type ContentImage
} from '$lib/shared/content/fields';
import { applyTokens, type ContentTokens } from '$lib/shared/content/tokens';
import type { RichTextDoc } from '$lib/shared/content/richtext';

/**
 * La lecture des donnees d'une section, au rendu.
 *
 * Chaque composant de section lirait sinon les memes quatre lignes : sortir la
 * valeur, verifier qu'elle est une chaine, appliquer les jetons du site. Une
 * seule de ces lignes oubliee quelque part, et un `{seuil}` s'affiche tel quel
 * sur le site public.
 *
 * `text` applique les jetons, `raw` non : une adresse ou une variante de mise
 * en page n'a rien a citer, et y substituer des valeurs n'aurait aucun sens.
 */
export interface SectionReader {
	text(key: string): string | null;
	raw(key: string): string | null;
	number(key: string): number | null;
	image(key: string): ContentImage | null;
	doc(key: string): RichTextDoc;
	/**
	 * Une variante de mise en page.
	 *
	 * La valeur stockee est confrontee a celles que le composant sait rendre :
	 * une variante retiree du registre, ou une donnee forgee, retombe sur le
	 * repli au lieu de produire une classe CSS vide et une section sans fond.
	 */
	choice<T extends string>(key: string, allowed: readonly T[], fallback: T): T;
	list(key: string): readonly Record<string, unknown>[];
	/** Une valeur de liste, jetons appliques. */
	itemText(item: unknown, key: string): string | null;
}

export function sectionReader(
	data: Readonly<Record<string, unknown>>,
	tokens: ContentTokens
): SectionReader {
	const withTokens = (value: string | null) => (value === null ? null : applyTokens(value, tokens));

	return {
		text: (key) => withTokens(readString(data, key)),
		raw: (key) => readString(data, key),
		number: (key) => readNumber(data, key),
		image: (key) => readImage(data, key),
		doc: (key) => readDoc(data, key),
		choice: (key, allowed, fallback) => {
			const value = readString(data, key);
			return allowed.find((candidate) => candidate === value) ?? fallback;
		},
		list: (key) => readList(data, key),
		itemText: (item, key) => withTokens(readString(item, key))
	};
}
