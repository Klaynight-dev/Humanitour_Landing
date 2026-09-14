<script lang="ts">
	import EmptyState from '$components/admin/EmptyState.svelte';
	import PageHeader from '$components/admin/PageHeader.svelte';
	import { formatDate } from '$lib/shared/format';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Journal — Back-office</title></svelte:head>

<PageHeader
	title="Journal"
	description="Qui a publie quoi, et quand. Un institut qui reproche l'opacite aux autres doit pouvoir le dire."
/>

{#if data.events.length === 0}
	<EmptyState title="Journal vide" description="Les actions du back-office apparaitront ici." />
{:else}
	<div class="border-line bg-paper rounded-card overflow-x-auto border">
		<table class="w-full min-w-[44rem] border-collapse text-sm">
			<thead>
				<tr class="border-line bg-surface border-b text-left">
					<th scope="col" class="px-5 py-3 font-semibold">Action</th>
					<th scope="col" class="px-3 py-3 font-semibold">Objet</th>
					<th scope="col" class="px-3 py-3 font-semibold">Auteur</th>
					<th scope="col" class="px-5 py-3 text-right font-semibold">Date</th>
				</tr>
			</thead>
			<tbody>
				{#each data.events as event (event.id)}
					<tr class="border-line border-b last:border-0">
						<td class="px-5 py-2.5">
							<code class="bg-surface rounded px-1.5 py-0.5 text-xs">{event.action}</code>
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
			</tbody>
		</table>
	</div>

	{#if data.nextCursor}
		<div class="mt-4">
			<a
				href="?avant={encodeURIComponent(data.nextCursor)}"
				class="border-line hover:bg-paper rounded-pill border px-4 py-2 text-sm font-medium"
			>
				Entrees plus anciennes
			</a>
		</div>
	{/if}
{/if}
