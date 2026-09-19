<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** Vrai des qu'un filtre est actif : commande l'apparition du lien de remise a zero. */
		active: boolean;
		children: Snippet;
	}

	let { active, children }: Props = $props();
</script>

<!--
	Filtres en `method="GET"` : l'etat du filtrage vit dans l'URL, donc il se
	partage, se met en favori et survit au rechargement. Aucun JavaScript n'est
	necessaire, comme pour le reste du back-office.
-->
<form method="GET" class="panel mb-5 flex flex-wrap items-end gap-3 px-4 py-3">
	{@render children()}

	<button
		type="submit"
		class="bg-ink text-paper press rounded-pill inline-flex min-h-11 items-center justify-center px-4 py-2 text-sm font-semibold"
	>
		Filtrer
	</button>

	{#if active}
		<a
			href="?"
			class="text-muted inline-flex min-h-11 items-center text-sm underline decoration-2 underline-offset-2"
		>
			Tout afficher
		</a>
	{/if}
</form>
