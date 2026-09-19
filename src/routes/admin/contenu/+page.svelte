<script lang="ts">
	import PageHeader from '$components/admin/PageHeader.svelte';
	import StatusBadge from '$components/admin/StatusBadge.svelte';
	import Table from '$components/admin/Table.svelte';
	import { formatCount, formatDate } from '$lib/shared/format';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Contenu du site, back-office</title></svelte:head>

<PageHeader
	title="Contenu du site"
	description="Les pages publiques éditables ici. Tant qu'une page n'est pas publiée, le site affiche son contenu d'origine."
/>

<Table empty={false} emptyTitle="" minWidth="44rem">
	{#snippet head()}
		<th scope="col" class="px-5 py-3 font-semibold">Page</th>
		<th scope="col" class="px-3 py-3 font-semibold">État</th>
		<th scope="col" class="px-3 py-3 text-right font-semibold">Blocs</th>
		<th scope="col" class="px-5 py-3 text-right font-semibold">Dernière modification</th>
	{/snippet}
	{#snippet body()}
		{#each data.pages as page (page.key)}
			<tr class="border-ink/12 border-b last:border-0">
				<td class="px-5 py-3">
					<a href="/admin/contenu/{page.key.toLowerCase()}" class="font-semibold hover:underline">
						{page.label}
					</a>
					<p class="text-muted mt-0.5 text-xs">{page.href} — {page.description}</p>
				</td>
				<td class="px-3 py-3">
					{#if page.status}
						<StatusBadge status={page.status} />
					{:else}
						<span class="text-muted text-sm">Jamais éditée</span>
					{/if}
				</td>
				<td class="tabular px-3 py-3 text-right">{formatCount(page.blockCount)}</td>
				<td class="text-muted px-5 py-3 text-right text-xs">
					{#if page.updatedAt}
						{formatDate(page.updatedAt)}{#if page.updatedBy}, {page.updatedBy}{/if}
					{:else}
						—
					{/if}
				</td>
			</tr>
		{/each}
	{/snippet}
</Table>
