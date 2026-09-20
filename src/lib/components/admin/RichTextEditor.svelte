<script lang="ts">
	import { browser } from '$app/environment';
	import {
		safeHref,
		toPlainText,
		type RichTextBlock,
		type RichTextDoc,
		type RichTextInline,
		type RichTextMark
	} from '$lib/shared/content/richtext';

	interface Props {
		name: string;
		label: string;
		help?: string;
		doc: RichTextDoc;
		disabled?: boolean;
	}

	let { name, label, help, doc, disabled = false }: Props = $props();

	/**
	 * Editeur de texte enrichi.
	 *
	 * Sans JavaScript, c'est un `textarea` ordinaire et le serveur accepte le
	 * texte brut : le back-office reste utilisable, comme partout ailleurs ici.
	 * Avec JavaScript, la zone editable prend sa place et le formulaire emporte
	 * le document sous forme de JSON.
	 *
	 * Le document soumis est revalide par le serveur (`parseRichText`). Ce qui
	 * part d'ici n'est donc jamais cru sur parole.
	 *
	 * DEUX REGLES TIENNENT CE FICHIER, et les enfreindre efface du contenu :
	 *
	 * 1. Svelte ne possede aucun noeud a l'interieur de la zone editable. Le
	 *    navigateur remanie ces noeuds a chaque frappe — il coupe un texte en
	 *    deux, remplace un `p` par un `div`, glisse un `br` — alors qu'un bloc
	 *    `{#each}` garde des references vers ceux qu'il a crees. Au premier
	 *    rafraichissement des donnees, Svelte ecrivait dans des noeuds qui
	 *    n'existaient plus et la saisie partait en morceaux. Le contenu est donc
	 *    peint a la main (`paint`), une fois, et relu a la main (`readBlocks`).
	 *
	 * 2. Le champ cache porte sa valeur ET sa valeur d'origine (`commit`).
	 *    `use:enhance` remet le formulaire a zero apres un enregistrement
	 *    reussi, et `reset()` rend a chaque champ sa valeur d'origine : un champ
	 *    dont seule la propriete `value` avait bouge revenait au document
	 *    d'avant la saisie, que l'enregistrement suivant renvoyait tel quel au
	 *    serveur. C'est ce qui effacait les modifications une fois sur deux.
	 */
	// La zone editable ne peut pas rendre service avant que le script tourne :
	// `browser` dit exactement cela, sans passer par un effet.
	const enhanced = browser;

	let editor: HTMLDivElement | undefined = $state();
	let hidden: HTMLInputElement | undefined = $state();

	/** Ce que la barre d'outils allume, d'apres la position du curseur. */
	let marks: string[] = $state([]);
	let format: string = $state('p');

	/** Une adresse de lien refusee, affichee jusqu'a la tentative suivante. */
	let notice: string | null = $state(null);

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
	 * Perdre la coupure serait accoler deux phrases, la rendre comme un bloc a
	 * part ne coute rien.
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
	 * depuis un traitement de texte apporte des balises inattendues, et perdre
	 * leur mise en forme est acceptable, perdre le texte ne l'est pas.
	 */
	function readBlocks(container: Element): RichTextBlock[] {
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

	/* ------------------------------------------------------------------ */
	/* Le modele vers la zone editable                                     */
	/* ------------------------------------------------------------------ */

	function wrap(tag: 'strong' | 'em', node: Node): HTMLElement {
		const element = document.createElement(tag);
		element.append(node);
		return element;
	}

	/**
	 * Un fragment de texte vers ses noeuds.
	 *
	 * Rien n'est construit depuis une chaine de HTML : le texte reste un noeud
	 * de texte, et l'adresse d'un lien repasse par `safeHref`. Une balise
	 * arrivee de la base n'a donc aucun chemin jusqu'ici.
	 */
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

	function nodeOf(block: RichTextBlock): HTMLElement {
		if (block.type === 'bullet-list' || block.type === 'ordered-list') {
			const list = document.createElement(block.type === 'bullet-list' ? 'ul' : 'ol');
			for (const item of block.items) list.append(lineInto(document.createElement('li'), item));
			return list;
		}

		const element = document.createElement(block.type === 'heading' ? 'h3' : 'p');
		return lineInto(element, block.items.at(0) ?? []);
	}

	function paint(source: RichTextDoc) {
		if (!editor) return;
		const nodes = source.blocks.map(nodeOf);
		// Un paragraphe, toujours : dans une zone editable vide, la premiere
		// frappe se poserait sinon en texte nu, hors de tout bloc.
		if (nodes.length === 0) nodes.push(lineInto(document.createElement('p'), []));

		// La regle interdit de toucher au DOM sous Svelte, parce que le runtime
		// se perd entre ce qu'il attend et ce qu'il trouve. C'est exactement le
		// bug repare ici, pris par l'autre bout : dans une zone editable, c'est le
		// NAVIGATEUR qui remanie les noeuds a chaque frappe, et le runtime se
		// perdait quoi qu'on fasse. On lui retire donc la zone entiere — elle n'a
		// aucun enfant dans le gabarit — au lieu de la lui disputer.
		// eslint-disable-next-line svelte/no-dom-manipulating
		editor.replaceChildren(...nodes);
	}

	/* ------------------------------------------------------------------ */
	/* Le champ soumis                                                     */
	/* ------------------------------------------------------------------ */

	/** Voir la regle 2 en tete de fichier : `defaultValue` autant que `value`. */
	function commit(json: string) {
		if (!hidden) return;
		hidden.value = json;
		hidden.defaultValue = json;
	}

	function sync() {
		if (!editor) return;
		commit(JSON.stringify({ blocks: readBlocks(editor) }));
	}

	/**
	 * Le document charge, peint une seule fois.
	 *
	 * Il ne rebouge qu'a l'arrivee d'une version venue d'ailleurs : un
	 * enregistrement, une duplication, un modele reapplique. La frappe, elle, ne
	 * change pas cette propriete, donc la zone editable n'est jamais repeinte
	 * sous les doigts.
	 */
	let painted = '';

	$effect(() => {
		const incoming = JSON.stringify(doc);
		if (!editor || !hidden || incoming === painted) return;

		painted = incoming;
		paint(doc);
		sync();
	});

	/* ------------------------------------------------------------------ */
	/* La barre d'outils                                                   */
	/* ------------------------------------------------------------------ */

	const MARK_COMMANDS = ['bold', 'italic', 'insertUnorderedList', 'insertOrderedList'];

	/** Ce que la selection porte deja : c'est tout ce qui distingue un editeur d'un champ. */
	function readState() {
		marks = MARK_COMMANDS.filter((command) => document.queryCommandState(command));
		format = document.queryCommandValue('formatBlock').toLowerCase() || 'p';
	}

	$effect(() => {
		if (!editor) return;

		const onSelection = () => {
			const node = document.getSelection()?.anchorNode;
			if (node && editor?.contains(node)) readState();
		};

		document.addEventListener('selectionchange', onSelection);
		return () => document.removeEventListener('selectionchange', onSelection);
	});

	/**
	 * `execCommand` est deprecie mais reste la seule facon courte d'appliquer une
	 * mise en forme a la selection dans tous les navigateurs. La sortie n'est
	 * jamais crue : elle repasse par `readBlocks`, puis par le serveur.
	 */
	function apply(command: string, value?: string) {
		editor?.focus();
		document.execCommand(command, false, value);
		sync();
		readState();
	}

	/**
	 * Sans ces deux reglages, `execCommand` rend des `div` a chaque retour a la
	 * ligne et des `span` de style pour le gras : des noeuds que le serialiseur
	 * devrait deviner. On lui demande des paragraphes et de vraies balises.
	 */
	function prepare() {
		document.execCommand('defaultParagraphSeparator', false, 'p');
		document.execCommand('styleWithCSS', false, 'false');
		readState();
	}

	function addLink() {
		const raw = prompt('Adresse du lien : https://…, /une-page-du-site ou #une-section');
		if (raw === null) return;

		const href = safeHref(raw);
		if (href === null) {
			notice = `Adresse refusée : « ${raw} ». Seuls http, https, mailto et les adresses du site sont acceptés.`;
			return;
		}

		notice = null;
		apply('createLink', href);
	}

	/** Le collage arrive en texte : la mise en forme d'origine n'entre pas. */
	function onPaste(event: ClipboardEvent) {
		event.preventDefault();
		document.execCommand('insertText', false, event.clipboardData?.getData('text/plain') ?? '');
		sync();
	}

	/**
	 * La barre d'outils ne prend jamais le curseur.
	 *
	 * Sans ca, le clic sort de la zone editable avant que la commande s'applique
	 * et la selection est perdue : le bouton « Gras » ne met alors rien en gras.
	 */
	function holdSelection(event: MouseEvent) {
		event.preventDefault();
	}

	const TOOLS = [
		{ label: 'Gras', title: 'Mettre en gras', command: 'bold', value: undefined },
		{ label: 'Italique', title: 'Mettre en italique', command: 'italic', value: undefined },
		{ label: 'Sous-titre', title: 'Transformer en sous-titre', command: 'formatBlock', value: 'h3' },
		{ label: 'Paragraphe', title: 'Revenir au paragraphe', command: 'formatBlock', value: 'p' },
		{
			label: 'Liste à puces',
			title: 'Liste à puces',
			command: 'insertUnorderedList',
			value: undefined
		},
		{
			label: 'Liste numérotée',
			title: 'Liste numérotée',
			command: 'insertOrderedList',
			value: undefined
		}
	];

	function isActive(tool: { command: string; value: string | undefined }): boolean {
		return tool.value === undefined ? marks.includes(tool.command) : format === tool.value;
	}
</script>

<div class="flex flex-col gap-1.5">
	<span class="text-sm font-semibold">{label}</span>
	{#if help}<span class="text-muted text-xs">{help}</span>{/if}

	{#if enhanced && !disabled}
		<!--
			Le contour du champ se pose ici, sur le cadre entier : la zone editable
			renonce au sien (`focus:outline-none`) parce qu'un contour decale de 3 px
			passerait derriere la barre d'outils. Le clavier voit donc toujours ou il
			se trouve, ce que R-32 exige.
		-->
		<div
			class="border-ink/20 rounded-field focus-within:outline-ink border focus-within:outline-2"
		>
			<!--
				`group` et non `toolbar` : le motif ARIA « toolbar » promet une
				navigation aux fleches avec un seul arret de tabulation, qu'on
				n'implemente pas. Un groupe nomme ne promet rien de tel, et chaque
				bouton reste un arret de tabulation ordinaire.
			-->
			<div
				class="border-ink/12 flex flex-wrap gap-1 border-b p-1.5"
				role="group"
				aria-label="Mise en forme de « {label} »"
			>
				{#each TOOLS as tool (tool.label)}
					<button
						type="button"
						title={tool.title}
						aria-pressed={isActive(tool)}
						onmousedown={holdSelection}
						onclick={() => apply(tool.command, tool.value)}
						class="rounded-field press min-h-11 px-3 py-1.5 text-sm font-medium {isActive(tool)
							? 'bg-ink text-paper hover:bg-ink-soft'
							: 'hover:bg-cream'}"
					>
						{tool.label}
					</button>
				{/each}

				<button
					type="button"
					title="Poser un lien sur le texte sélectionné"
					onmousedown={holdSelection}
					onclick={addLink}
					class="hover:bg-cream rounded-field press min-h-11 px-3 py-1.5 text-sm font-medium"
				>
					Lien
				</button>
				<button
					type="button"
					title="Retirer le lien du texte sélectionné"
					onmousedown={holdSelection}
					onclick={() => apply('unlink')}
					class="hover:bg-cream rounded-field press min-h-11 px-3 py-1.5 text-sm font-medium"
				>
					Retirer le lien
				</button>
			</div>

			<!--
				Zone editable sans le moindre enfant dans le gabarit : voir la regle 1
				en tete de fichier. `paint` la remplit, `readBlocks` la relit.
			-->
			<div
				bind:this={editor}
				contenteditable="true"
				role="textbox"
				aria-multiline="true"
				aria-label={label}
				tabindex="0"
				oninput={sync}
				onblur={sync}
				onfocus={prepare}
				onpaste={onPaste}
				class="bg-paper min-h-32 px-3 py-2 focus:outline-none [&>*:first-child]:mt-0 [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mt-2 [&_ul]:list-disc"
			></div>
		</div>

		{#if notice}
			<p class="text-danger text-sm" role="status">{notice}</p>
		{/if}

		<input type="hidden" {name} bind:this={hidden} />
	{:else}
		<textarea
			{name}
			rows="6"
			{disabled}
			class="border-ink/20 bg-paper rounded-field min-h-11 border px-3 py-2">{toPlainText(doc)}</textarea
		>
	{/if}
</div>
