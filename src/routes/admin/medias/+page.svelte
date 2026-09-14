<script lang="ts">
	import { enhance } from '$app/forms';
	import EmptyState from '$components/admin/EmptyState.svelte';
	import PageHeader from '$components/admin/PageHeader.svelte';
	import Panel from '$components/admin/Panel.svelte';
	import StatusBadge from '$components/admin/StatusBadge.svelte';
	import { formatDate } from '$lib/shared/format';
	import { can } from '$lib/shared/permissions';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let creating = $state(false);
</script>

<svelte:head><title>Mediatheque — Back-office</title></svelte:head>

<PageHeader
	title="Mediatheque"
	description="Articles, reportages video, podcasts et reprises de presse."
>
	{#snippet actions()}
		{#if can(data.user, 'media.write')}
			<button
				type="button"
				onclick={() => (creating = !creating)}
				class="bg-ink text-paper hover:bg-coral-600 rounded-pill px-4 py-2 text-sm font-semibold transition-colors"
			>
				{creating ? 'Annuler' : 'Nouveau media'}
			</button>
		{/if}
	{/snippet}
</PageHeader>

{#if form?.message}
	<p role="status" class="border-line bg-paper rounded-card mb-5 border px-4 py-3 text-sm">
		{form.message}
	</p>
{/if}

{#if creating && can(data.user, 'media.write')}
	<div class="mb-6">
		<Panel title="Nouveau media">
			<form method="POST" action="?/create" use:enhance class="flex flex-wrap items-end gap-3">
				<label class="flex min-w-56 flex-1 flex-col gap-1.5">
					<span class="text-sm font-semibold">Titre</span>
					<input name="title" required minlength="3" class="border-line rounded-lg border px-3 py-2" />
				</label>
				<label class="flex flex-col gap-1.5">
					<span class="text-sm font-semibold">Nature</span>
					<select name="kind" class="border-line rounded-lg border px-3 py-2">
						{#each data.kinds as kind (kind.key)}
							<option value={kind.key}>{kind.label}</option>
						{/each}
					</select>
				</label>
				<button
					type="submit"
					class="bg-ink text-paper rounded-pill px-5 py-2.5 text-sm font-semibold"
				>
					Creer
				</button>
			</form>
		</Panel>
	</div>
{/if}

{#if data.items.length === 0}
	<EmptyState
		title="Mediatheque vide"
		description="Les echanges enregistres sur le terrain, une fois montes, viendront ici."
	/>
{:else}
	<div class="border-line bg-paper rounded-card overflow-x-auto border">
		<table class="w-full min-w-[40rem] border-collapse text-sm">
			<thead>
				<tr class="border-line bg-surface border-b text-left">
					<th scope="col" class="px-5 py-3 font-semibold">Titre</th>
					<th scope="col" class="px-3 py-3 font-semibold">Nature</th>
					<th scope="col" class="px-3 py-3 font-semibold">Statut</th>
					<th scope="col" class="px-5 py-3 text-right font-semibold">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each data.items as item (item.id)}
					<tr class="border-line border-b last:border-0">
						<td class="px-5 py-3">
							<a href="/admin/medias/{item.id}" class="font-semibold hover:underline">
								{item.title}
							</a>
							<p class="text-muted mt-0.5 text-xs">
								/medias/{item.slug}
								{#if item.publishedAt}· {formatDate(item.publishedAt)}{/if}
								{#if item.author}· {item.author}{/if}
							</p>
						</td>
						<td class="px-3 py-3">{item.kindLabel}</td>
						<td class="px-3 py-3"><StatusBadge status={item.status} /></td>
						<td class="px-5 py-3">
							<div class="flex justify-end gap-2">
								<a
									href="/admin/medias/{item.id}"
									class="border-line hover:bg-surface rounded-pill border px-3 py-1.5 text-xs font-medium"
								>
									Modifier
								</a>
								{#if can(data.user, 'media.delete')}
									<form method="POST" action="?/delete" use:enhance>
										<input type="hidden" name="id" value={item.id} />
										<button
											type="submit"
											class="border-danger/30 text-danger hover:bg-danger/5 rounded-pill border px-3 py-1.5 text-xs"
										>
											Supprimer
										</button>
									</form>
								{/if}
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
