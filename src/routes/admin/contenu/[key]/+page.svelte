<script lang="ts">
	import { enhance } from '$app/forms';
	import EmptyState from '$components/admin/EmptyState.svelte';
	import Flash from '$components/admin/Flash.svelte';
	import PageHeader from '$components/admin/PageHeader.svelte';
	import Panel from '$components/admin/Panel.svelte';
	import StatusBadge from '$components/admin/StatusBadge.svelte';
	import { formatDate } from '$lib/shared/format';
	import { can } from '$lib/shared/permissions';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const editable = $derived(can(data.user, 'content.write'));
	const publishable = $derived(can(data.user, 'content.publish'));
</script>

<svelte:head><title>{data.page.label} — Back-office</title></svelte:head>

<PageHeader
	title={data.page.label}
	breadcrumb={[{ label: 'Contenu du site', href: '/admin/contenu' }]}
	description="Page publique : {data.page.href}"
>
	{#snippet actions()}
		{#if data.status}
			<StatusBadge status={data.status} />
		{/if}
		{#if publishable && data.blocks.length > 0}
			{#if data.status === 'PUBLISHED'}
				<form method="POST" action="?/unpublish" use:enhance>
					<button
						type="submit"
						class="border-ink/25 press bg-paper rounded-pill inline-flex min-h-11 items-center justify-center border px-4 py-2 text-sm font-medium"
					>
						Dépublier
					</button>
				</form>
			{:else}
				<form method="POST" action="?/publish" use:enhance>
					<button
						type="submit"
						class="bg-ink text-paper press rounded-pill inline-flex min-h-11 items-center justify-center px-4 py-2 text-sm font-semibold"
					>
						Publier
					</button>
				</form>
			{/if}
		{/if}
	{/snippet}
</PageHeader>

<Flash message={form?.message} />

<div class="grid gap-6 lg:grid-cols-[1fr_20rem]">
	<div class="flex flex-col gap-6">
		{#if data.blocks.length === 0}
			<EmptyState
				title="Page vide"
				description="Ajoutez un premier bloc. Tant que la page n'est pas publiée, le site continue d'afficher son contenu d'origine."
			/>
		{/if}

		{#each data.blocks as block, index (block.id)}
			<Panel title={block.typeLabel} description="Bloc {index + 1} sur {data.blocks.length}">
				<form method="POST" action="?/saveBlock" use:enhance class="flex flex-col gap-4">
					<input type="hidden" name="id" value={block.id} />

					{#if block.fields.length === 0}
						<p class="text-warning text-sm">
							Ce bloc utilise un type qui n'existe plus (« {block.type} »). Il n'est plus éditable,
							seulement supprimable.
						</p>
					{/if}

					{#each block.fields as field (field.name)}
						<label class="flex flex-col gap-1.5">
							<span class="text-sm font-semibold">
								{field.label}
								{#if field.required}<span class="text-danger">*</span>{/if}
							</span>
							{#if field.help}
								<span class="text-muted text-xs">{field.help}</span>
							{/if}
							{#if field.type === 'textarea'}
								<textarea
									name="data.{field.name}"
									rows="3"
									disabled={!editable}
									class="border-ink/20 bg-paper rounded-field min-h-11 border px-3 py-2"
									>{String(block.data[field.name] ?? '')}</textarea
								>
							{:else}
								<input
									name="data.{field.name}"
									type={field.type === 'number' ? 'number' : 'text'}
									value={String(block.data[field.name] ?? '')}
									disabled={!editable}
									class="border-ink/20 bg-paper rounded-field min-h-11 border px-3 py-2"
								/>
							{/if}
						</label>
					{/each}

					{#if editable}
						<div class="flex flex-wrap gap-2">
							{#if block.fields.length > 0}
								<button
									type="submit"
									class="bg-ink text-paper press rounded-pill inline-flex min-h-11 items-center justify-center px-5 py-2.5 text-sm font-semibold"
								>
									Enregistrer
								</button>
							{/if}
							<button
								type="submit"
								formaction="?/moveBlock"
								name="direction"
								value="up"
								disabled={index === 0}
								class="border-ink/25 bg-paper press rounded-pill inline-flex min-h-11 items-center justify-center border px-3 py-2 text-sm disabled:opacity-30"
								aria-label="Monter ce bloc"
							>
								↑
							</button>
							<button
								type="submit"
								formaction="?/moveBlock"
								name="direction"
								value="down"
								disabled={index === data.blocks.length - 1}
								class="border-ink/25 bg-paper press rounded-pill inline-flex min-h-11 items-center justify-center border px-3 py-2 text-sm disabled:opacity-30"
								aria-label="Descendre ce bloc"
							>
								↓
							</button>
							<button
								type="submit"
								formaction="?/deleteBlock"
								class="border-ink/25 text-danger bg-paper press rounded-pill inline-flex min-h-11 items-center justify-center border px-4 py-2 text-sm"
							>
								Supprimer
							</button>
						</div>
					{/if}
				</form>
			</Panel>
		{/each}

		{#if editable}
			<Panel title="Ajouter un bloc">
				<form method="POST" action="?/addBlock" use:enhance class="flex flex-wrap items-end gap-3">
					<label class="flex min-w-56 flex-1 flex-col gap-1.5">
						<span class="text-sm font-semibold">Type de bloc</span>
						<select
							name="type"
							class="border-ink/20 bg-paper rounded-field min-h-11 border px-3 py-2"
						>
							{#each data.blockTypes as type (type.key)}
								<option value={type.key}>{type.label} — {type.description}</option>
							{/each}
						</select>
					</label>
					<button
						type="submit"
						class="bg-ink text-paper press rounded-pill inline-flex min-h-11 items-center justify-center px-5 py-2.5 text-sm font-semibold"
					>
						Ajouter
					</button>
				</form>
			</Panel>
		{/if}
	</div>

	<aside class="flex flex-col gap-6">
		<Panel title="État">
			<dl class="flex flex-col gap-3 text-sm">
				<div class="flex justify-between gap-3">
					<dt class="text-muted">Sur le site</dt>
					<dd class="font-semibold">
						{data.status === 'PUBLISHED' ? 'Cette version' : "Le contenu d'origine"}
					</dd>
				</div>
				<div class="flex justify-between gap-3">
					<dt class="text-muted">Blocs</dt>
					<dd class="tabular font-semibold">{data.blocks.length}</dd>
				</div>
				{#if data.publishedAt}
					<div class="flex justify-between gap-3">
						<dt class="text-muted">Publiée le</dt>
						<dd class="font-semibold">{formatDate(data.publishedAt)}</dd>
					</div>
				{/if}
				{#if data.updatedAt}
					<div class="flex justify-between gap-3">
						<dt class="text-muted">Modifiée le</dt>
						<dd class="font-semibold">{formatDate(data.updatedAt)}</dd>
					</div>
				{/if}
			</dl>

			<a href={data.page.href} class="text-coral-ink mt-4 inline-block text-sm underline">
				Voir la page publique
			</a>
		</Panel>

		<Panel title="Comment ça marche">
			<p class="text-muted text-sm">
				Tant que la page n'est pas publiée, le site affiche le contenu écrit dans le code. Publier
				remplace cet affichage par vos blocs ; dépublier revient à l'état d'origine, sans rien
				perdre de ce que vous avez saisi.
			</p>
		</Panel>
	</aside>
</div>
