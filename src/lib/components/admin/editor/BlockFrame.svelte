<script lang="ts">
	import { sectionComponent } from '$components/content/registry';

	interface Props {
		index: number;
		total: number;
		type: string;
		label: string;
		data: Record<string, unknown>;
		selected: boolean;
		invalid: string | null;
		onselect: () => void;
		onmove: (direction: -1 | 1) => void;
		onduplicate: () => void;
		onremove: () => void;
	}

	let {
		index,
		total,
		type,
		label,
		data,
		selected,
		invalid,
		onselect,
		onmove,
		onduplicate,
		onremove
	}: Props = $props();

	const Section = $derived(sectionComponent(type));

	/** Le premier clic ne supprime rien : la section est la page publiee. */
	let confirming = $state(false);

	const TOOL =
		'border-ink/25 bg-paper press rounded-field inline-flex min-h-11 min-w-11 items-center justify-center border px-3 text-sm font-medium disabled:opacity-30';
</script>

<!--
	Une section de la page, telle que le site la rend, sous un calque d'edition.

	Le contenu est `inert` : ses liens et ses boutons ne repondent ni a la souris
	ni a la tabulation. Sans cela, cliquer une section pour la modifier suivrait
	le lien qu'elle contient, et la tabulation traverserait la page publique
	entiere avant d'atteindre la commande suivante de l'editeur.
-->
<div class="group relative" data-selected={selected ? '' : undefined}>
	<div inert class="pointer-events-none">
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
		class="pointer-events-none absolute inset-0 transition-[outline-color] {selected
			? 'outline-ink outline-2 -outline-offset-2'
			: 'group-hover:outline-ink/30 outline-2 -outline-offset-2 outline-transparent'}"
	></div>

	<button
		type="button"
		onclick={onselect}
		class="absolute inset-0 h-full w-full cursor-pointer"
		aria-pressed={selected}
	>
		<span class="sr-only">Modifier la section {index + 1}, {label}</span>
	</button>

	<!--
		Les commandes restent atteignables au clavier meme effacees : `focus-within`
		les rend visibles des qu'on les atteint par tabulation, et la section
		selectionnee les garde affichees.
	-->
	<div
		class="absolute top-3 right-3 z-10 flex flex-wrap justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 {selected
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

	{#if invalid}
		<p
			class="bg-danger text-paper absolute bottom-3 left-3 z-10 max-w-md rounded-field px-3 py-2 text-sm font-medium"
			role="status"
		>
			{invalid}
		</p>
	{/if}
</div>
