<script lang="ts">
	import FilterBar from '$components/admin/FilterBar.svelte';
	import PageHeader from '$components/admin/PageHeader.svelte';
	import Table from '$components/admin/Table.svelte';
	import { formatDate } from '$lib/shared/format';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const filtering = $derived(data.filters.search !== '' || data.filters.entity !== '');

	/**
	 * Le lien « plus anciennes » doit emporter les filtres actifs, sinon la page
	 * suivante revient sur le journal entier et la lecture repart de zero.
	 */
	const olderHref = $derived.by(() => {
		if (!data.nextCursor) return null;

		const parts = [`avant=${encodeURIComponent(data.nextCursor)}`];
		if (data.filters.search !== '') parts.push(`q=${encodeURIComponent(data.filters.search)}`);
		if (data.filters.entity !== '') parts.push(`objet=${encodeURIComponent(data.filters.entity)}`);

		return `?${parts.join('&')}`;
	});
</script>

<svelte:head><title>Journal, back-office</title></svelte:head>

<PageHeader
	title="Journal"
	description="Qui a publié quoi, et quand. Un institut qui reproche l'opacité aux autres doit pouvoir le dire."
/>

<FilterBar active={filtering}>
	<label class="flex min-w-56 flex-1 flex-col gap-1.5">
		<span class="text-sm font-semibold">Rechercher</span>
		<input
			type="search"
			name="q"
			value={data.filters.search}
			placeholder="Action ou auteur"
			class="border-ink/20 bg-paper rounded-field min-h-11 border px-3 py-2"
		/>
	</label>
	<label class="flex flex-col gap-1.5">
		<span class="text-sm font-semibold">Objet</span>
		<select name="objet" class="border-ink/20 bg-paper rounded-field min-h-11 border px-3 py-2">
			<option value="">Tous</option>
			{#each data.entities as entity (entity)}
				<option value={entity} selected={data.filters.entity === entity}>{entity}</option>
			{/each}
		</select>
	</label>
</FilterBar>

<Table
	empty={data.events.length === 0}
	emptyTitle={filtering ? 'Aucune entrée ne correspond' : 'Journal vide'}
	emptyDescription={filtering
		? 'Élargissez la recherche ou changez l’objet demandé.'
		: 'Les actions du back-office apparaîtront ici.'}
	minWidth="44rem"
>
	{#snippet head()}
		<th scope="col" class="px-5 py-3 font-semibold">Action</th>
		<th scope="col" class="px-3 py-3 font-semibold">Objet</th>
		<th scope="col" class="px-3 py-3 font-semibold">Auteur</th>
		<th scope="col" class="px-5 py-3 text-right font-semibold">Date</th>
	{/snippet}
	{#snippet body()}
		{#each data.events as event (event.id)}
			<tr class="border-ink/12 border-b last:border-0">
				<td class="px-5 py-2.5">
					<code class="bg-cream rounded px-1.5 py-0.5 text-xs">{event.action}</code>
				</td>
				<td class="px-3 py-2.5">
					<span>{event.entity}</span>
					{#if event.metadata !== '{}'}
						<span class="text-muted block font-mono text-xs">{event.metadata}</span>
					{/if}
				</td>
				<td class="px-3 py-2.5">{event.actor}</td>
				<td class="text-muted px-5 py-2.5 text-right text-xs">
					{formatDate(event.createdAt)}
				</td>
			</tr>
		{/each}
	{/snippet}
</Table>

{#if olderHref}
	<div class="mt-4">
		<a
			href={olderHref}
			class="border-ink/25 press bg-paper rounded-pill inline-flex min-h-11 items-center justify-center border px-4 py-2 text-sm font-medium"
		>
			Entrées plus anciennes
		</a>
	</div>
{/if}
