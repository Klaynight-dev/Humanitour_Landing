<script lang="ts">
	import { safeHref } from '$lib/shared/content/richtext';

	interface Props {
		/** Le champ enrichi qui a le curseur, ou `null` : la barre disparait alors. */
		element: HTMLElement | null;
		onapply: (command: string, value?: string) => void;
	}

	let { element, onapply }: Props = $props();

	/**
	 * La barre de mise en forme, posee au-dessus du champ en cours de saisie.
	 *
	 * Elle ne s'affiche que pour un champ enrichi : un titre ne se met pas en
	 * gras, sa graisse est celle de la charte. C'est aussi pour ca qu'elle suit
	 * le curseur au lieu de vivre en haut de l'ecran — la ou elle est, elle dit
	 * ce qu'on peut faire du texte qu'on est en train de taper.
	 */
	let top = $state(0);
	let left = $state(0);
	let marks: string[] = $state([]);
	let format = $state('p');
	let notice: string | null = $state(null);

	const MARK_COMMANDS = ['bold', 'italic', 'insertUnorderedList', 'insertOrderedList'];

	function place() {
		if (!element) return;

		const box = element.getBoundingClientRect();
		// Ancree au champ et non a la selection : une barre qui saute a chaque
		// caractere est plus fatigante qu'utile.
		top = box.top + window.scrollY;
		left = box.left + window.scrollX;
	}

	function readState() {
		marks = MARK_COMMANDS.filter((command) => document.queryCommandState(command));
		format = document.queryCommandValue('formatBlock').toLowerCase() || 'p';
	}

	$effect(() => {
		if (!element) return;

		place();
		readState();

		const onSelection = () => {
			const node = document.getSelection()?.anchorNode;
			if (node && element?.contains(node)) readState();
		};

		document.addEventListener('selectionchange', onSelection);
		window.addEventListener('scroll', place, true);
		window.addEventListener('resize', place);

		return () => {
			document.removeEventListener('selectionchange', onSelection);
			window.removeEventListener('scroll', place, true);
			window.removeEventListener('resize', place);
		};
	});

	/**
	 * La barre ne prend jamais le curseur.
	 *
	 * Sans ca, le clic sort du champ avant que la commande s'applique et la
	 * selection est perdue : le bouton « Gras » ne met alors rien en gras. C'est
	 * aussi ce qui empeche `focusout` de refermer la barre au moment ou on
	 * l'utilise.
	 */
	function hold(event: MouseEvent) {
		event.preventDefault();
	}

	function run(command: string, value?: string) {
		notice = null;
		onapply(command, value);
		readState();
	}

	function addLink() {
		const raw = prompt('Adresse du lien : https://…, /une-page-du-site ou #une-section');
		if (raw === null) return;

		const href = safeHref(raw);
		if (href === null) {
			notice = 'Adresse refusée : seuls http, https, mailto et les adresses du site sont acceptés.';
			return;
		}

		run('createLink', href);
	}

	const TOOLS = [
		{ label: 'Gras', title: 'Mettre en gras', command: 'bold', value: undefined },
		{ label: 'Italique', title: 'Mettre en italique', command: 'italic', value: undefined },
		{ label: 'Sous-titre', title: 'Transformer en sous-titre', command: 'formatBlock', value: 'h3' },
		{ label: 'Paragraphe', title: 'Revenir au paragraphe', command: 'formatBlock', value: 'p' },
		{ label: 'Puces', title: 'Liste à puces', command: 'insertUnorderedList', value: undefined },
		{
			label: 'Numéros',
			title: 'Liste numérotée',
			command: 'insertOrderedList',
			value: undefined
		}
	];

	function isActive(tool: { command: string; value: string | undefined }): boolean {
		return tool.value === undefined ? marks.includes(tool.command) : format === tool.value;
	}

	const TOOL = 'rounded-field press min-h-11 px-3 text-sm font-medium';
</script>

{#if element}
	<div
		class="border-ink/20 bg-paper rounded-field absolute z-30 flex flex-wrap items-center gap-1 border p-1 shadow-[0_10px_30px_-12px_rgb(0_0_0/0.35)]"
		style:top="{top}px"
		style:left="{left}px"
		style:transform="translateY(calc(-100% - 0.5rem))"
		role="group"
		aria-label="Mise en forme du texte"
	>
		{#each TOOLS as tool (tool.label)}
			<button
				type="button"
				title={tool.title}
				aria-pressed={isActive(tool)}
				onmousedown={hold}
				onclick={() => run(tool.command, tool.value)}
				class="{TOOL} {isActive(tool) ? 'bg-ink text-paper hover:bg-ink-soft' : 'hover:bg-cream'}"
			>
				{tool.label}
			</button>
		{/each}

		<button type="button" title="Poser un lien" onmousedown={hold} onclick={addLink} class="{TOOL} hover:bg-cream">
			Lien
		</button>
		<button
			type="button"
			title="Retirer le lien"
			onmousedown={hold}
			onclick={() => run('unlink')}
			class="{TOOL} hover:bg-cream"
		>
			Sans lien
		</button>

		{#if notice}
			<p class="text-danger w-full px-2 py-1 text-sm" role="status">{notice}</p>
		{/if}
	</div>
{/if}
