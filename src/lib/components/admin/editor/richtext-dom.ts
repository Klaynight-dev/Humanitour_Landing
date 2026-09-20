import {
	safeHref,
	type RichTextBlock,
	type RichTextDoc,
	type RichTextInline,
	type RichTextMark
} from '$lib/shared/content/richtext';

/**
 * Le pont entre le modele de texte enrichi et une zone editable.
 *
 * Deux directions, et rien d'autre : peindre un document dans un element
 * (`paintInto`), et relire cet element (`readBlocks`). Aucune des deux ne
 * connait Svelte, ce qui est exactement le point — dans une zone editable,
 * c'est le NAVIGATEUR qui remanie les noeuds a chaque frappe, et un runtime qui
 * croit les posseder finit par ecrire dans des noeuds disparus.
 *
 * Deux appelants s'en servent : le champ du panneau (`RichTextEditor`) et
 * l'edition dans le texte rendu (`inline.ts`). Une seule implementation, sans
 * quoi le meme paragraphe se relirait differemment selon l'endroit ou on l'a
 * tape (AGENTS.md section 1.5).
 *
 * Rien n'est jamais construit depuis une chaine de HTML : le texte reste un
 * noeud de texte et l'adresse d'un lien repasse par `safeHref`. Une balise
 * venue de la base n'a donc aucun chemin jusqu'a l'ecran.
 */

const BLOCK_TAGS: Record<string, RichTextBlock['type']> = {
	P: 'paragraph',
	DIV: 'paragraph',
	BLOCKQUOTE: 'paragraph',
	H1: 'heading',
	H2: 'heading',
	H3: 'heading',
	H4: 'heading',
	H5: 'heading',
	H6: 'heading',
	UL: 'bullet-list',
	OL: 'ordered-list'
};

/* ------------------------------------------------------------------ */
/* La zone editable vers le modele                                     */
/* ------------------------------------------------------------------ */

/** Les marques d'un element, ajoutees a celles que portent ses parents. */
function marksWith(inherited: RichTextMark[], element: HTMLElement): RichTextMark[] {
	const tag = element.tagName;
	const weight = element.style.fontWeight;
	const strong = tag === 'STRONG' || tag === 'B' || weight === 'bold' || weight === '700';
	const em = tag === 'EM' || tag === 'I' || element.style.fontStyle === 'italic';

	if (!strong && !em) return inherited;

	const next = [...inherited];
	if (strong && !next.includes('strong')) next.push('strong');
	if (em && !next.includes('em')) next.push('em');
	return next;
}

/**
 * Les fragments de texte d'une suite de noeuds, coupes a chaque `br`.
 *
 * Le modele n'a pas de saut de ligne : un `br` y devient une ligne de plus.
 * Perdre la coupure serait accoler deux phrases, la rendre comme un bloc a part
 * ne coute rien.
 */
function readRuns(nodes: Node[]): RichTextInline[][] {
	const lines: RichTextInline[][] = [[]];

	function walk(node: Node, held: RichTextMark[], href: string | undefined) {
		if (node.nodeType === Node.TEXT_NODE) {
			const text = node.textContent ?? '';
			if (text === '') return;
			lines[lines.length - 1]!.push({
				text,
				...(held.length > 0 ? { marks: [...held] } : {}),
				...(href === undefined ? {} : { href })
			});
			return;
		}

		if (!(node instanceof HTMLElement)) return;
		if (node.tagName === 'BR') {
			lines.push([]);
			return;
		}

		const link = node instanceof HTMLAnchorElement ? (node.getAttribute('href') ?? href) : href;
		const nested = marksWith(held, node);
		for (const child of Array.from(node.childNodes)) walk(child, nested, link);
	}

	for (const node of nodes) walk(node, [], undefined);
	return lines.filter((line) => line.length > 0);
}

/** Un element de bloc vers le modele : une liste, un titre, des paragraphes. */
function blocksOf(element: HTMLElement, type: RichTextBlock['type']): RichTextBlock[] {
	if (type === 'bullet-list' || type === 'ordered-list') {
		const items = Array.from(element.children)
			.filter((child) => child.tagName === 'LI')
			.flatMap((li) => readRuns(Array.from(li.childNodes)));
		return items.length === 0 ? [] : [{ type, items }];
	}

	// Un bloc qui en contient d'autres : `execCommand` imbrique volontiers une
	// liste dans le paragraphe ou elle a ete demandee. On redescend, sinon la
	// liste se lirait comme une phrase et ses puces disparaitraient.
	if (Array.from(element.children).some((child) => BLOCK_TAGS[child.tagName] !== undefined)) {
		return readBlocks(element);
	}

	return readRuns(Array.from(element.childNodes)).map((line) => ({ type, items: [line] }));
}

/**
 * Tout ce qui n'est pas un bloc reconnu devient un paragraphe : un collage
 * depuis un traitement de texte apporte des balises inattendues, et perdre leur
 * mise en forme est acceptable, perdre le texte ne l'est pas.
 */
export function readBlocks(container: Element): RichTextBlock[] {
	const blocks: RichTextBlock[] = [];
	let loose: Node[] = [];

	function flush() {
		for (const line of readRuns(loose)) blocks.push({ type: 'paragraph', items: [line] });
		loose = [];
	}

	for (const node of Array.from(container.childNodes)) {
		const type = node instanceof HTMLElement ? BLOCK_TAGS[node.tagName] : undefined;
		if (!(node instanceof HTMLElement) || type === undefined) {
			loose.push(node);
			continue;
		}
		flush();
		blocks.push(...blocksOf(node, type));
	}

	flush();
	return blocks;
}

/** Le document que porte cet element, tel qu'il sera enregistre. */
export function readDoc(container: Element): RichTextDoc {
	return { blocks: readBlocks(container) };
}

/* ------------------------------------------------------------------ */
/* Le modele vers la zone editable                                     */
/* ------------------------------------------------------------------ */

function wrap(tag: 'strong' | 'em', node: Node): HTMLElement {
	const element = document.createElement(tag);
	element.append(node);
	return element;
}

function runNode(run: RichTextInline): Node {
	let node: Node = document.createTextNode(run.text);
	if (run.marks?.includes('em')) node = wrap('em', node);
	if (run.marks?.includes('strong')) node = wrap('strong', node);

	const href = run.href === undefined ? null : safeHref(run.href);
	if (href === null) return node;

	const link = document.createElement('a');
	link.setAttribute('href', href);
	link.append(node);
	return link;
}

/** Une ligne vide garde un `br` : sans lui, le navigateur ne sait pas ou poser le curseur. */
function lineInto(element: HTMLElement, runs: RichTextInline[]): HTMLElement {
	for (const run of runs) element.append(runNode(run));
	if (element.childNodes.length === 0) element.append(document.createElement('br'));
	return element;
}

/**
 * Un bloc vers son element.
 *
 * `classes` habille les balises produites : dans le panneau elles restent nues,
 * dans le texte rendu elles doivent reprendre l'allure du site, sinon le
 * paragraphe qu'on vient de taper ne ressemble pas a celui d'a cote.
 */
function nodeOf(block: RichTextBlock, classes: Readonly<Record<string, string>>): HTMLElement {
	if (block.type === 'bullet-list' || block.type === 'ordered-list') {
		const tag = block.type === 'bullet-list' ? 'ul' : 'ol';
		const list = document.createElement(tag);
		if (classes[tag]) list.className = classes[tag];
		for (const item of block.items) list.append(lineInto(document.createElement('li'), item));
		return list;
	}

	const tag = block.type === 'heading' ? 'h3' : 'p';
	const element = document.createElement(tag);
	if (classes[tag]) element.className = classes[tag];
	return lineInto(element, block.items.at(0) ?? []);
}

/**
 * Peint un document dans un element, en remplacant ce qu'il contenait.
 *
 * Un paragraphe, toujours : dans une zone editable vide, la premiere frappe se
 * poserait sinon en texte nu, hors de tout bloc.
 */
export function paintInto(
	container: Element,
	doc: RichTextDoc,
	classes: Readonly<Record<string, string>> = {}
): void {
	const nodes = doc.blocks.map((block) => nodeOf(block, classes));
	if (nodes.length === 0) {
		const empty = document.createElement('p');
		if (classes['p']) empty.className = classes['p'];
		nodes.push(lineInto(empty, []));
	}
	container.replaceChildren(...nodes);
}

/**
 * Releve les classes que le site pose sur chaque balise du texte enrichi.
 *
 * `RichText.svelte` habille ses paragraphes, ses titres et ses listes ; quand
 * `execCommand` en cree un nouveau, il arrive nu. On lit donc l'habillage sur
 * ce qui est deja la, plutot que de recopier ici des classes qui divergeraient
 * du jour ou `RichText.svelte` change.
 */
export function classesOf(container: Element): Record<string, string> {
	const classes: Record<string, string> = {};

	for (const tag of ['p', 'h3', 'ul', 'ol']) {
		const found = container.querySelector(tag);
		if (found && found.className !== '') classes[tag] = found.className;
	}

	return classes;
}

/**
 * Demande a `execCommand` des balises plutot que des `div` et des styles.
 *
 * Sans ces deux reglages, un retour a la ligne produit un `div` et le gras un
 * `span` de style : des noeuds que la relecture devrait deviner.
 */
export function prepareCommands(): void {
	document.execCommand('defaultParagraphSeparator', false, 'p');
	document.execCommand('styleWithCSS', false, 'false');
}
