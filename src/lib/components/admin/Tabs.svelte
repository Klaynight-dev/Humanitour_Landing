<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Tab {
		readonly id: string;
		readonly label: string;
		readonly panel: Snippet;
	}

	interface Props {
		label: string;
		tabs: readonly Tab[];
	}

	let { label, tabs }: Props = $props();
	let selected: string | undefined = $state(undefined);
	const activeId = $derived(selected ?? tabs[0]?.id);

	/**
	 * Reserve aux ecrans dont chaque onglet n existe qu avec JS (tableau de
	 * bord, editeur de contenu) : un onglet masque par `hidden` sort du flux
	 * sans JavaScript, ce qui degraderait une page deja utilisable sans script
	 * comme /admin/sondages/[id]. Ne pas y brancher ce composant.
	 */
</script>

<div role="tablist" aria-label={label} class="border-ink/12 mb-5 flex gap-1 border-b">
	{#each tabs as tab (tab.id)}
		<button
			type="button"
			role="tab"
			id="tab-{tab.id}"
			aria-selected={activeId === tab.id}
			aria-controls="panel-{tab.id}"
			class="press -mb-px border-b-2 px-4 py-2.5 text-sm font-medium {activeId === tab.id
				? 'border-ink text-ink'
				: 'text-muted border-transparent hover:text-ink'}"
			onclick={() => (selected = tab.id)}
		>
			{tab.label}
		</button>
	{/each}
</div>

{#each tabs as tab (tab.id)}
	<div id="panel-{tab.id}" role="tabpanel" aria-labelledby="tab-{tab.id}" hidden={activeId !== tab.id}>
		{@render tab.panel()}
	</div>
{/each}
