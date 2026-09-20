import { classesOf, paintInto, prepareCommands, readDoc } from './richtext-dom';
import type { RichTextDoc } from '$lib/shared/content/richtext';

/**
 * L'edition dans le texte rendu.
 *
 * Le principe tient en une phrase : les composants publics marquent les
 * elements qui portent un champ (`data-field="title"`,
 * `data-field="items.0.term"`), et ce module les rend modifiables. C'est un
 * attribut, pas du code : le site public ne telecharge aucun editeur, et un
 * visiteur ne peut rien en faire.
 *
 * Le chemin de l'attribut est le MEME que le nom du champ de formulaire
 * (`readNested`, `setPath`). Le texte rendu et le panneau designent donc le
 * meme champ, et ne peuvent pas se contredire.
 *
 * Deux natures de champ, et la difference n'est pas cosmetique :
 *
 * - `data-field-kind="text"` (le defaut) porte une chaine. La zone est en
 *   `plaintext-only` : un collage riche n'y depose pas de balise, et le modele
 *   de contenu n'en accepterait de toute facon aucune ;
 * - `data-field-kind="doc"` porte un texte enrichi. La zone accepte le gras,
 *   l'italique, les listes et les liens, et se relit avec le meme moteur que
 *   le champ du panneau.
 */

export type FieldKind = 'text' | 'doc';

export interface FieldChange {
	readonly path: string;
	readonly kind: FieldKind;
	readonly value: string | RichTextDoc;
}

export interface InlineHandle {
	/**
	 * Les chemins reellement modifiables dans le rendu.
	 *
	 * Le panneau s'en sert pour NE PAS les proposer une seconde fois : un champ
	 * qui a deux surfaces de saisie finit par en avoir une des deux en retard, et
	 * c'est celle qu'on enregistre qui perd.
	 */
	readonly paths: readonly string[];
	/** Detache tout : ecouteurs, attributs, zones editables. */
	destroy(): void;
}

interface Options {
	readonly onchange: (change: FieldChange) => void;
	/** Appele quand le curseur entre dans un champ, ou en sort (`null`). */
	readonly onfocus: (field: { path: string; kind: FieldKind; element: HTMLElement } | null) => void;
	readonly onselect: () => void;
}

function kindOf(element: HTMLElement): FieldKind {
	return element.dataset['fieldKind'] === 'doc' ? 'doc' : 'text';
}

/**
 * Neutralise ce qui est cliquable sans etre modifiable.
 *
 * Dans l'editeur, un lien du site ne doit pas naviguer et un bouton ne doit pas
 * agir : on editerait une page qui s'echappe sous les doigts. `inert` fait les
 * deux d'un coup — ni souris, ni tabulation — mais il ne se leve pas sur un
 * descendant, donc il se pose element par element, jamais sur le bloc entier.
 * Un lien A L'INTERIEUR d'un champ enrichi est epargne : c'est du contenu, et
 * le curseur doit pouvoir y entrer.
 */
function neutralise(root: HTMLElement): HTMLElement[] {
	const touched: HTMLElement[] = [];

	for (const node of Array.from(root.querySelectorAll('a, button, input, select, textarea'))) {
		if (!(node instanceof HTMLElement)) continue;
		if (node.closest('[data-field]')) continue;

		node.inert = true;
		touched.push(node);
	}

	return touched;
}

/**
 * Rend modifiables les champs marques d'un bloc.
 *
 * Rend une poignee : l'appelant la detruit quand le bloc change de section ou
 * quitte l'ecran, sinon les ecouteurs survivent au noeud qu'ils observaient.
 */
export function attachInline(root: HTMLElement, options: Options): InlineHandle {
	prepareCommands();

	const fields = Array.from(root.querySelectorAll('[data-field]')).filter(
		(node): node is HTMLElement => node instanceof HTMLElement
	);
	const inerted = neutralise(root);
	const cleanups: (() => void)[] = [];
	const paths: string[] = [];

	for (const element of fields) {
		const path = element.dataset['field'];
		if (path === undefined || path === '') continue;

		const kind = kindOf(element);
		paths.push(path);

		// `plaintext-only` pour une chaine : le navigateur refuse alors lui-meme
		// les balises, plutot que de nous laisser les retirer apres coup.
		element.setAttribute('contenteditable', kind === 'doc' ? 'true' : 'plaintext-only');
		element.setAttribute('role', 'textbox');
		element.setAttribute('spellcheck', 'true');
		if (kind === 'doc') element.setAttribute('aria-multiline', 'true');

		const onInput = () => {
			options.onchange({
				path,
				kind,
				value: kind === 'doc' ? readDoc(element) : (element.textContent ?? '')
			});
		};

		const onFocusIn = () => {
			options.onselect();
			options.onfocus({ path, kind, element });
		};

		const onFocusOut = () => options.onfocus(null);

		/*
		 * Le collage arrive en texte, des deux cotes. Dans un champ enrichi, la
		 * mise en forme d'origine apporterait des balises que le modele ne connait
		 * pas ; dans un champ simple, `plaintext-only` s'en charge deja, mais un
		 * navigateur qui l'ignore retomberait sinon sur du HTML colle.
		 */
		const onPaste = (event: ClipboardEvent) => {
			event.preventDefault();
			const text = event.clipboardData?.getData('text/plain') ?? '';
			document.execCommand('insertText', false, text);
			onInput();
		};

		/*
		 * Dans un champ simple, la touche Entree ne doit pas creer de ligne : la
		 * valeur est une chaine, et un titre sur deux lignes ne se rendrait pas
		 * comme il s'affiche ici.
		 */
		const onKeydown = (event: KeyboardEvent) => {
			if (kind === 'text' && event.key === 'Enter') event.preventDefault();
		};

		element.addEventListener('input', onInput);
		element.addEventListener('focusin', onFocusIn);
		element.addEventListener('focusout', onFocusOut);
		element.addEventListener('paste', onPaste);
		element.addEventListener('keydown', onKeydown);

		cleanups.push(() => {
			element.removeEventListener('input', onInput);
			element.removeEventListener('focusin', onFocusIn);
			element.removeEventListener('focusout', onFocusOut);
			element.removeEventListener('paste', onPaste);
			element.removeEventListener('keydown', onKeydown);
			element.removeAttribute('contenteditable');
			element.removeAttribute('role');
			element.removeAttribute('spellcheck');
			element.removeAttribute('aria-multiline');
		});
	}

	return {
		paths,
		destroy() {
			for (const cleanup of cleanups) cleanup();
			for (const node of inerted) node.inert = false;
		}
	};
}

/**
 * Applique une commande de mise en forme au champ enrichi qui a le curseur.
 *
 * `execCommand` est deprecie mais reste la seule facon courte d'appliquer une
 * mise en forme a la selection dans tous les navigateurs. Sa sortie n'est
 * jamais crue : elle repasse par `readDoc`, puis par la validation du serveur.
 */
export function applyCommand(element: HTMLElement, command: string, value?: string): RichTextDoc {
	element.focus();
	document.execCommand(command, false, value);
	return readDoc(element);
}

/**
 * Repeint un champ enrichi, en gardant l'habillage du site.
 *
 * Sert apres une reinitialisation : la zone editable porte alors ce que le
 * navigateur y a laisse, et il faut la ramener au document voulu. Les classes
 * sont relevees sur place plutot que recopiees ici, pour ne pas diverger de
 * `RichText.svelte`.
 */
export function repaintField(element: HTMLElement, doc: RichTextDoc): void {
	paintInto(element, doc, classesOf(element));
}
