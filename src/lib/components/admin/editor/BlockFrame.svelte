<script lang="ts">
	import { sectionComponent } from '$components/content/registry';
	import { attachInline, type FieldChange, type FieldKind } from './inline';

	interface Props {
		index: number;
		total: number;
		type: string;
		label: string;
		data: Record<string, unknown>;
		selected: boolean;
		invalid: string | null;
		editable: boolean;
		onselect: () => void;
		onmove: (direction: -1 | 1) => void;
		onduplicate: () => void;
		onremove: () => void;
		/** A chaque frappe dans le rendu. L'appelant decide quand la retenir. */
		onedit: (change: FieldChange) => void;
		/** Le champ enrichi qui a le curseur, pour y poser la barre de mise en forme. */
		onfield: (field: { kind: FieldKind; element: HTMLElement } | null) => void;
		/** Les chemins modifiables dans le rendu : le panneau ne les repropose pas. */
		oninline: (paths: readonly string[]) => void;
		/** Le curseur quitte un champ : c'est la que la saisie est retenue. */
		oncommit: () => void;
	}

	let {
		index,
		total,
		type,
		label,
		data,
		selected,
		invalid,
		editable,
		onselect,
		onmove,
		onduplicate,
		onremove,
		onedit,
		onfield,
		oninline,
		oncommit
	}: Props = $props();

	const Section = $derived(sectionComponent(type));

	/** Le premier clic ne supprime rien : la section est la page publiee. */
	let confirming = $state(false);

	let canvas: HTMLDivElement | undefined = $state();

	/**
	 * L'edition dans le texte rendu, montee sur les elements que les composants
	 * publics ont marques.
	 *
	 * L'effet depend de `data` : quand le panneau modifie un reglage, Svelte
	 * refait une partie du rendu, et les elements neufs n'ont ni attribut
	 * `contenteditable` ni ecouteur. On redetache et on remonte.
	 *
	 * Ce qui est tape dans le rendu, lui, ne repasse PAS par `data` tant que le
	 * curseur y est : voir `oncommit`. Sinon Svelte reconstruirait sous les
	 * doigts les noeuds qu'on est en train de remplir — c'est le titre marque
	 * (`Marked`), decoupe en trois morceaux, qui le montre le plus vite.
	 */
	$effect(() => {
		void data;
		if (!canvas || !editable) return;

		const handle = attachInline(canvas, {
			onchange: onedit,
			onfocus: (field) => {
				if (field === null) {
					onfield(null);
					oncommit();
					return;
				}
				onfield({ kind: field.kind, element: field.element });
			},
			onselect
		});

		oninline(handle.paths);
		return () => handle.destroy();
	});

	const TOOL =
		'border-ink/25 bg-paper press rounded-field inline-flex min-h-11 min-w-11 items-center justify-center border px-3 text-sm font-medium disabled:opacity-30';
</script>

<!--
	Une section de la page, telle que le site la rend.

	Ce qui est marque d'un `data-field` se tape directement dedans ; le reste des
	elements cliquables est neutralise un par un (`inert`) pour qu'un clic dans un
	titre ne suive pas le lien d'a cote et que la tabulation ne traverse pas la
	page publique entiere entre deux commandes.
-->
<div
	class="group relative"
	role="presentation"
	onclick={onselect}
	onfocusin={onselect}
>
	<div bind:this={canvas}>
		{#if Section}
			<Section id="section-{index}" {data} />
		{:else}
			<p class="text-warning bg-cream p-8 text-center text-sm">
				Type de section inconnu (« {type} »). Elle ne s'affiche plus sur le site et n'est plus
				modifiable, seulement supprimable.
			</p>
		{/if}
	</div>

	<!--
		Le cadre de selection est un contour et non un fond : la section doit se
		lire exactement comme sur le site, sinon l'apercu ment.
	-->
	<div
		aria-hidden="true"
		class="pointer-events-none absolute inset-0 outline-2 -outline-offset-2 {selected
			? 'outline-ink'
			: 'group-hover:outline-ink/30 outline-transparent'}"
	></div>

	{#if editable}
		<!--
			Les commandes restent atteignables au clavier meme effacees :
			`focus-within` les rend visibles des qu'on les atteint par tabulation, et
			la section selectionnee les garde affichees.
		-->
		<div
			class="absolute top-3 right-3 z-20 flex flex-wrap justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 {selected
				? 'opacity-100'
				: ''}"
		>
			<span
				class="bg-ink text-paper rounded-field inline-flex min-h-11 items-center px-3 text-sm font-semibold"
			>
				{label}
			</span>
			<button
				type="button"
				class={TOOL}
				onclick={onselect}
				aria-label="Ouvrir les réglages de la section {index + 1}"
			>
				Réglages
			</button>
			<button
				type="button"
				class={TOOL}
				disabled={index === 0}
				onclick={() => onmove(-1)}
				aria-label="Monter la section {index + 1}"
			>
				↑
			</button>
			<button
				type="button"
				class={TOOL}
				disabled={index === total - 1}
				onclick={() => onmove(1)}
				aria-label="Descendre la section {index + 1}"
			>
				↓
			</button>
			<button type="button" class={TOOL} onclick={onduplicate}>Dupliquer</button>

			{#if confirming}
				<button
					type="button"
					class="bg-danger text-paper press rounded-field inline-flex min-h-11 items-center px-3 text-sm font-semibold"
					onclick={() => {
						confirming = false;
						onremove();
					}}
				>
					Confirmer
				</button>
				<button type="button" class={TOOL} onclick={() => (confirming = false)}>Annuler</button>
			{:else}
				<button type="button" class="{TOOL} text-danger" onclick={() => (confirming = true)}>
					Supprimer
				</button>
			{/if}
		</div>
	{/if}

	{#if invalid}
		<p
			class="bg-danger text-paper rounded-field absolute bottom-3 left-3 z-20 max-w-md px-3 py-2 text-sm font-medium"
			role="status"
		>
			{invalid}
		</p>
	{/if}
</div>
