<script lang="ts">
	import EmptyState from '$components/admin/EmptyState.svelte';
	import PageHeader from '$components/admin/PageHeader.svelte';
	import Table from '$components/admin/Table.svelte';
	import { formatDate } from '$lib/shared/format';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const KIND_LABELS: Record<string, string> = {
		survey: 'Sondage',
		media: 'Média',
		user: 'Compte'
	};
</script>

<svelte:head><title>Recherche, back-office</title></svelte:head>

<PageHeader
	title="Recherche"
	description="Sondages, médias et comptes. Vous ne voyez ici que ce que vos permissions vous laissent déjà consulter."
/>

<form method="GET" class="panel mb-5 flex flex-wrap items-end gap-3 px-4 py-3">
	<label class="flex min-w-64 flex-1 flex-col gap-1.5">
		<span class="text-sm font-semibold">Votre recherche</span>
		<input
			type="search"
			name="q"
			value={data.query}
			placeholder="Un titre, une adresse publique, un nom, un courriel"
			class="border-ink/20 bg-paper rounded-field min-h-11 border px-3 py-2"
		/>
	</label>
	<button
		type="submit"
		class="bg-ink text-paper press rounded-pill inline-flex min-h-11 items-center justify-center px-5 py-2.5 text-sm font-semibold"
	>
		Rechercher
	</button>
</form>

{#if data.query === ''}
	<EmptyState
		title="Que cherchez-vous ?"
		description="Saisissez un mot : la recherche porte sur les titres, les adresses publiques, les noms et les courriels."
	/>
{:else}
	<Table
		empty={data.results.length === 0}
		emptyTitle="Aucun résultat"
		emptyDescription="Rien ne correspond à « {data.query} » dans ce que vous pouvez consulter."
		minWidth="40rem"
	>
		{#snippet head()}
			<th scope="col" class="px-5 py-3 font-semibold">Résultat</th>
			<th scope="col" class="px-3 py-3 font-semibold">Type</th>
			<th scope="col" class="px-5 py-3 text-right font-semibold">Modifié le</th>
		{/snippet}
		{#snippet body()}
			{#each data.results as result (result.kind + result.id)}
				<tr class="border-ink/12 border-b last:border-0">
					<td class="px-5 py-3">
						<a href={result.href} class="font-semibold hover:underline">{result.title}</a>
						{#if result.subtitle}
							<p class="text-muted mt-0.5 text-xs">{result.subtitle}</p>
						{/if}
					</td>
					<td class="px-3 py-3 text-sm">{KIND_LABELS[result.kind] ?? result.kind}</td>
					<td class="text-muted px-5 py-3 text-right text-xs">
						{formatDate(result.updatedAt)}
					</td>
				</tr>
			{/each}
		{/snippet}
	</Table>
{/if}
