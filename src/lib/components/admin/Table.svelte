<script lang="ts">
	import type { Snippet } from 'svelte';
	import EmptyState from './EmptyState.svelte';

	interface Props {
		empty: boolean;
		emptyTitle: string;
		emptyDescription?: string;
		/** Largeur minimale avant defilement horizontal : depend du nombre de colonnes de chaque page. */
		minWidth?: string;
		head: Snippet;
		body: Snippet;
	}

	let { empty, emptyTitle, emptyDescription, minWidth = '40rem', head, body }: Props = $props();
</script>

<!--
	Habillage commun des tableaux du back-office : chaque page reecrivait le
	meme conteneur `panel overflow-x-auto` et le meme entete zebre. Les lignes
	restent au choix de l appelant (via le snippet `body`), leurs colonnes et
	actions different trop d une page a l autre pour etre generalisees ici.
-->
{#if empty}
	<EmptyState title={emptyTitle} description={emptyDescription} />
{:else}
	<div class="panel overflow-x-auto">
		<table class="w-full border-collapse text-sm" style:min-width={minWidth}>
			<thead>
				<tr class="border-ink/12 bg-cream border-b text-left">
					{@render head()}
				</tr>
			</thead>
			<tbody>
				{@render body()}
			</tbody>
		</table>
	</div>
{/if}
