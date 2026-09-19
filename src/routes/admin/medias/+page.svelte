<script lang="ts">
	import { enhance } from '$app/forms';
	import Dialog from '$components/admin/Dialog.svelte';
	import FilterBar from '$components/admin/FilterBar.svelte';
	import Flash from '$components/admin/Flash.svelte';
	import PageHeader from '$components/admin/PageHeader.svelte';
	import Panel from '$components/admin/Panel.svelte';
	import StatusBadge from '$components/admin/StatusBadge.svelte';
	import Table from '$components/admin/Table.svelte';
	import { formatDate } from '$lib/shared/format';
	import { can } from '$lib/shared/permissions';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let creating = $state(false);
	let deleteTarget: { id: string; title: string } | null = $state(null);
	let deleteForm: HTMLFormElement | undefined = $state();

	const filtering = $derived(
		data.filters.search !== '' || data.filters.status !== null || data.filters.kind !== null
	);
</script>

<svelte:head><title>Médiathèque, back-office</title></svelte:head>

<PageHeader
	title="Médiathèque"
	description="Articles, reportages vidéo, podcasts et reprises de presse."
>
	{#snippet actions()}
		{#if can(data.user, 'media.write')}
			<button
				type="button"
				onclick={() => (creating = !creating)}
				class="bg-ink text-paper press rounded-pill px-4 py-2 text-sm font-semibold min-h-11 inline-flex items-center justify-center"
			>
				{creating ? 'Annuler' : 'Nouveau média'}
			</button>
		{/if}
	{/snippet}
</PageHeader>

<Flash message={form?.message} />

{#if creating && can(data.user, 'media.write')}
	<div class="mb-6">
		<Panel title="Nouveau média">
			<form method="POST" action="?/create" use:enhance class="flex flex-wrap items-end gap-3">
				<label class="flex min-w-56 flex-1 flex-col gap-1.5">
					<span class="text-sm font-semibold">Titre</span>
					<input name="title" required minlength="3" class="border-ink/20 bg-paper rounded-field border px-3 py-2 min-h-11" />
				</label>
				<label class="flex flex-col gap-1.5">
					<span class="text-sm font-semibold">Nature</span>
					<select name="kind" class="border-ink/20 bg-paper rounded-field border px-3 py-2 min-h-11">
						{#each data.kinds as kind (kind.key)}
							<option value={kind.key}>{kind.label}</option>
						{/each}
					</select>
				</label>
				<button
					type="submit"
					class="bg-ink text-paper press rounded-pill px-5 py-2.5 text-sm font-semibold min-h-11 inline-flex items-center justify-center"
				>
					Créer
				</button>
			</form>
		</Panel>
	</div>
{/if}

<FilterBar active={filtering}>
	<label class="flex min-w-56 flex-1 flex-col gap-1.5">
		<span class="text-sm font-semibold">Rechercher</span>
		<input
			type="search"
			name="q"
			value={data.filters.search}
			placeholder="Titre, adresse ou chapô"
			class="border-ink/20 bg-paper rounded-field min-h-11 border px-3 py-2"
		/>
	</label>
	<label class="flex flex-col gap-1.5">
		<span class="text-sm font-semibold">Nature</span>
		<select name="nature" class="border-ink/20 bg-paper rounded-field min-h-11 border px-3 py-2">
			<option value="">Toutes</option>
			{#each data.kinds as kind (kind.key)}
				<option value={kind.key} selected={data.filters.kind === kind.key}>{kind.label}</option>
			{/each}
		</select>
	</label>
	<label class="flex flex-col gap-1.5">
		<span class="text-sm font-semibold">Statut</span>
		<select name="statut" class="border-ink/20 bg-paper rounded-field min-h-11 border px-3 py-2">
			<option value="">Tous</option>
			<option value="DRAFT" selected={data.filters.status === 'DRAFT'}>Brouillon</option>
			<option value="SCHEDULED" selected={data.filters.status === 'SCHEDULED'}>Programmé</option>
			<option value="PUBLISHED" selected={data.filters.status === 'PUBLISHED'}>Publié</option>
			<option value="ARCHIVED" selected={data.filters.status === 'ARCHIVED'}>Archivé</option>
		</select>
	</label>
</FilterBar>

<Table
	empty={data.items.length === 0}
	emptyTitle={filtering ? 'Aucun média ne correspond' : 'Médiathèque vide'}
	emptyDescription={filtering
		? 'Élargissez la recherche, ou changez la nature et le statut demandés.'
		: 'Les échanges enregistrés sur le terrain, une fois montés, viendront ici.'}
>
	{#snippet head()}
		<th scope="col" class="px-5 py-3 font-semibold">Titre</th>
		<th scope="col" class="px-3 py-3 font-semibold">Nature</th>
		<th scope="col" class="px-3 py-3 font-semibold">Statut</th>
		<th scope="col" class="px-5 py-3 text-right font-semibold">Actions</th>
	{/snippet}
	{#snippet body()}
		{#each data.items as item (item.id)}
			<tr class="border-ink/12 border-b last:border-0">
				<td class="px-5 py-3">
					<a href="/admin/medias/{item.id}" class="font-semibold hover:underline">
						{item.title}
					</a>
					<p class="text-muted mt-0.5 text-xs">
						/medias/{item.slug}
						{#if item.publishedAt}, {formatDate(item.publishedAt)}{/if}
						{#if item.author}, {item.author}{/if}
					</p>
				</td>
				<td class="px-3 py-3">{item.kindLabel}</td>
				<td class="px-3 py-3"><StatusBadge status={item.status} /></td>
				<td class="px-5 py-3">
					<div class="flex justify-end gap-2">
						<a
							href="/admin/medias/{item.id}"
							class="border-ink/25 press bg-paper rounded-pill border px-3 py-1.5 text-xs font-medium min-h-11 inline-flex items-center justify-center"
						>
							Modifier
						</a>
						{#if can(data.user, 'media.delete')}
							<button
								type="button"
								onclick={() => (deleteTarget = { id: item.id, title: item.title })}
								class="border-ink/25 text-danger bg-paper press rounded-pill border px-3 py-1.5 text-xs min-h-11 inline-flex items-center justify-center"
							>
								Supprimer
							</button>
						{/if}
					</div>
				</td>
			</tr>
		{/each}
	{/snippet}
</Table>

<form bind:this={deleteForm} method="POST" action="?/delete" use:enhance class="hidden">
	<input type="hidden" name="id" value={deleteTarget?.id ?? ''} />
</form>

<Dialog
	open={deleteTarget !== null}
	title="Supprimer ce média ?"
	onClose={() => (deleteTarget = null)}
>
	<p>
		« {deleteTarget?.title} » sera supprimé définitivement, y compris de la médiathèque publique.
	</p>
	{#snippet footer()}
		<button
			type="button"
			onclick={() => (deleteTarget = null)}
			class="border-ink/25 press bg-paper rounded-pill border px-4 py-2 text-sm font-medium min-h-11 inline-flex items-center justify-center"
		>
			Annuler
		</button>
		<button
			type="button"
			onclick={() => deleteForm?.requestSubmit()}
			class="text-danger border-ink/25 press bg-paper rounded-pill border px-4 py-2 text-sm font-semibold min-h-11 inline-flex items-center justify-center"
		>
			Supprimer
		</button>
	{/snippet}
</Dialog>
