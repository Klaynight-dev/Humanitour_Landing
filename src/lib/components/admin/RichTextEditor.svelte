<script lang="ts">
	import { browser } from '$app/environment';
	import {
		fromPlainText,
		toPlainText,
		type RichTextBlock,
		type RichTextDoc,
		type RichTextInline
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
	 */
	// La zone editable ne peut pas rendre service avant que le script tourne :
	// `browser` dit exactement cela, sans passer par un effet.
	const enhanced = browser;
	let editor: HTMLDivElement | undefined = $state();

	/**
	 * Document soumis, `null` tant que rien n'a ete saisi : le formulaire emporte
	 * alors le document tel qu'il a ete charge, sans que l'editeur ait eu a le
	 * recopier.
	 */
	let edited: string | null = $state(null);
	const serialized = $derived(edited ?? JSON.stringify(doc));

	/** Les marques portees par un noeud, d'apres ses parents dans la zone editable. */
	function marksOf(node: Node, root: Node): RichTextInline['marks'] {
		const marks: NonNullable<RichTextInline['marks']> = [];
		let current: Node | null = node;

		while (current && current !== root) {
			if (current instanceof HTMLElement) {
				const tag = current.tagName;
				if ((tag === 'STRONG' || tag === 'B') && !marks.includes('strong')) marks.push('strong');
				if ((tag === 'EM' || tag === 'I') && !marks.includes('em')) marks.push('em');
			}
			current = current.parentNode;
		}

		return marks.length > 0 ? marks : undefined;
	}

	function hrefOf(node: Node, root: Node): string | undefined {
		let current: Node | null = node;

		while (current && current !== root) {
			if (current instanceof HTMLAnchorElement) return current.getAttribute('href') ?? undefined;
			current = current.parentNode;
		}

		return undefined;
	}

	/** Les fragments de texte d'un element, avec leurs marques et leur lien. */
	function readInline(element: Element): RichTextInline[] {
		const runs: RichTextInline[] = [];
		const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);

		let node = walker.nextNode();
		while (node) {
			const text = node.textContent ?? '';
			if (text !== '') {
				runs.push({
					text,
					...(marksOf(node, element) ? { marks: marksOf(node, element) } : {}),
					...(hrefOf(node, element) ? { href: hrefOf(node, element) } : {})
				});
			}
			node = walker.nextNode();
		}

		return runs;
	}

	const BLOCK_TAGS: Record<string, RichTextBlock['type']> = {
		P: 'paragraph',
		DIV: 'paragraph',
		H3: 'heading',
		H2: 'heading',
		UL: 'bullet-list',
		OL: 'ordered-list'
	};

	/**
	 * La zone editable vers le modele.
	 *
	 * Tout ce qui n'est pas reconnu devient un paragraphe : un collage depuis un
	 * traitement de texte apporte des balises inattendues, et perdre leur mise en
	 * forme est acceptable, perdre le texte ne l'est pas.
	 */
	function serialize(): RichTextDoc {
		if (!editor) return { blocks: [] };

		const blocks: RichTextBlock[] = [];

		for (const child of Array.from(editor.children)) {
			const type = BLOCK_TAGS[child.tagName] ?? 'paragraph';

			if (type === 'bullet-list' || type === 'ordered-list') {
				const items = Array.from(child.children)
					.map((li) => readInline(li))
					.filter((item) => item.length > 0);
				if (items.length > 0) blocks.push({ type, items });
				continue;
			}

			const runs = readInline(child);
			if (runs.length > 0) blocks.push({ type, items: [runs] });
		}

		// Texte saisi sans bloc parent : le navigateur laisse parfois les premiers
		// caracteres nus dans la zone editable.
		if (blocks.length === 0 && editor.textContent?.trim()) {
			return fromPlainText(editor.textContent);
		}

		return { blocks };
	}

	function sync() {
		edited = JSON.stringify(serialize());
	}

	/**
	 * `execCommand` est deprecie mais reste la seule facon courte d'appliquer une
	 * mise en forme a la selection dans tous les navigateurs. La sortie n'est
	 * jamais crue : elle repasse par `serialize`, puis par le serveur.
	 */
	function apply(command: string, value?: string) {
		editor?.focus();
		document.execCommand(command, false, value);
		sync();
	}

	function addLink() {
		const url = prompt('Adresse du lien');
		if (url === null || url.trim() === '') return;
		apply('createLink', url.trim());
	}

	/** Le collage arrive en texte : la mise en forme d'origine n'entre pas. */
	function onPaste(event: ClipboardEvent) {
		event.preventDefault();
		const text = event.clipboardData?.getData('text/plain') ?? '';
		document.execCommand('insertText', false, text);
		sync();
	}

	const TOOLS = [
		{ label: 'Gras', title: 'Gras', command: 'bold' },
		{ label: 'Italique', title: 'Italique', command: 'italic' },
		{ label: 'Liste', title: 'Liste à puces', command: 'insertUnorderedList' },
		{ label: 'Numérotée', title: 'Liste numérotée', command: 'insertOrderedList' },
		{ label: 'Titre', title: 'Sous-titre', command: 'formatBlock', value: 'h3' },
		{ label: 'Normal', title: 'Paragraphe', command: 'formatBlock', value: 'p' }
	];
</script>

<!--
	Contenu initial de la zone editable.

	Les marques et les liens sont restitues tels quels : les afficher en texte nu
	ferait perdre la mise en forme au rechargement suivant, sans que personne ne
	l'ait demande.
-->
{#snippet editable(item: RichTextInline[])}
	{#each item as run, index (index)}
		{#if run.href}
			<a href={run.href}
				>{#if run.marks?.includes('strong')}<strong
						>{#if run.marks?.includes('em')}<em>{run.text}</em>{:else}{run.text}{/if}</strong
					>{:else if run.marks?.includes('em')}<em>{run.text}</em>{:else}{run.text}{/if}</a
			>
		{:else if run.marks?.includes('strong')}
			<strong
				>{#if run.marks?.includes('em')}<em>{run.text}</em>{:else}{run.text}{/if}</strong
			>
		{:else if run.marks?.includes('em')}
			<em>{run.text}</em>
		{:else}
			{run.text}
		{/if}
	{/each}
{/snippet}

<div class="flex flex-col gap-1.5">
	<span class="text-sm font-semibold">{label}</span>
	{#if help}<span class="text-muted text-xs">{help}</span>{/if}

	{#if enhanced && !disabled}
		<div class="border-ink/20 rounded-field border">
			<div class="border-ink/12 flex flex-wrap gap-1 border-b p-1.5" role="toolbar" aria-label="Mise en forme">
				{#each TOOLS as tool (tool.label)}
					<button
						type="button"
						title={tool.title}
						onclick={() => apply(tool.command, tool.value)}
						class="hover:bg-cream rounded-field min-h-11 px-3 py-1.5 text-sm font-medium"
					>
						{tool.label}
					</button>
				{/each}
				<button
					type="button"
					title="Insérer un lien"
					onclick={addLink}
					class="hover:bg-cream rounded-field min-h-11 px-3 py-1.5 text-sm font-medium"
				>
					Lien
				</button>
			</div>

			<div
				bind:this={editor}
				contenteditable="true"
				role="textbox"
				aria-multiline="true"
				aria-label={label}
				tabindex="0"
				oninput={sync}
				onblur={sync}
				onpaste={onPaste}
				class="bg-paper min-h-32 px-3 py-2 focus:outline-none [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mt-2 [&_ul]:list-disc"
			>
				{#each doc.blocks as block, index (index)}
					{#if block.type === 'heading'}
						<h3>{@render editable(block.items.at(0) ?? [])}</h3>
					{:else if block.type === 'bullet-list'}
						<ul>
							{#each block.items as item, itemIndex (itemIndex)}
								<li>{@render editable(item)}</li>
							{/each}
						</ul>
					{:else if block.type === 'ordered-list'}
						<ol>
							{#each block.items as item, itemIndex (itemIndex)}
								<li>{@render editable(item)}</li>
							{/each}
						</ol>
					{:else}
						<p>{@render editable(block.items.at(0) ?? [])}</p>
					{/if}
				{/each}
			</div>
		</div>

		<input type="hidden" {name} value={serialized} />
	{:else}
		<textarea
			{name}
			rows="6"
			{disabled}
			class="border-ink/20 bg-paper rounded-field min-h-11 border px-3 py-2">{toPlainText(doc)}</textarea
		>
	{/if}
</div>
