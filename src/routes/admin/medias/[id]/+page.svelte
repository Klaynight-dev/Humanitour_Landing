<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '$components/admin/PageHeader.svelte';
	import Panel from '$components/admin/Panel.svelte';
	import StatusBadge from '$components/admin/StatusBadge.svelte';
	import { can } from '$lib/shared/permissions';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const editable = $derived(can(data.user, 'media.write'));

	/** Une date vers la valeur attendue par un champ `datetime-local`. */
	function dateTimeValue(value: Date | null): string {
		if (!value) return '';
		const date = new Date(value);
		const offset = date.getTimezoneOffset() * 60_000;
		return new Date(date.getTime() - offset).toISOString().slice(0, 16);
	}
</script>

<svelte:head><title>{data.item.title} — Back-office</title></svelte:head>

<PageHeader
	title={data.item.title}
	breadcrumb={[{ label: 'Mediatheque', href: '/admin/medias' }]}
	description="{data.type.label} — /medias/{data.item.slug}"
>
	{#snippet actions()}
		<StatusBadge status={data.item.status} />
	{/snippet}
</PageHeader>

{#if form?.message}
	<p role="status" class="border-line bg-paper rounded-card mb-5 border px-4 py-3 text-sm">
		{form.message}
	</p>
{/if}

<form method="POST" action="?/save" use:enhance class="grid gap-6 lg:grid-cols-[1fr_20rem]">
	<div class="flex flex-col gap-6">
		<Panel title="Contenu">
			<div class="flex flex-col gap-4">
				<label class="flex flex-col gap-1.5">
					<span class="text-sm font-semibold">Titre</span>
					<input
						name="title"
						required
						value={data.item.title}
						disabled={!editable}
						class="border-line rounded-lg border px-3 py-2"
					/>
				</label>

				<label class="flex flex-col gap-1.5">
					<span class="text-sm font-semibold">Accroche</span>
					<span class="text-muted text-xs">
						Affichee sur la carte du media et dans les partages.
					</span>
					<textarea
						name="excerpt"
						rows="2"
						disabled={!editable}
						class="border-line rounded-lg border px-3 py-2">{data.item.excerpt ?? ''}</textarea
					>
				</label>

				{#if data.type.hasBody}
					<label class="flex flex-col gap-1.5">
						<span class="text-sm font-semibold">Corps de l'article</span>
						<span class="text-muted text-xs">
							Texte simple. Les sauts de ligne sont conserves, le HTML n'est pas interprete.
						</span>
						<textarea
							name="body"
							rows="16"
							disabled={!editable}
							class="border-line rounded-lg border px-3 py-2">{data.item.body ?? ''}</textarea
						>
					</label>
				{/if}
			</div>
		</Panel>

		{#if data.type.fields.length > 0}
			<Panel title="Champs propres a {data.type.label.toLowerCase()}">
				<div class="flex flex-col gap-4">
					{#each data.type.fields as field (field.name)}
						<label class="flex flex-col gap-1.5">
							<span class="text-sm font-semibold">
								{field.label}
								{#if field.required}<span class="text-danger">*</span>{/if}
							</span>
							{#if field.help}<span class="text-muted text-xs">{field.help}</span>{/if}

							{#if field.type === 'textarea'}
								<textarea
									name="data.{field.name}"
									rows="6"
									disabled={!editable}
									class="border-line rounded-lg border px-3 py-2">{field.value}</textarea
								>
							{:else}
								<input
									type={field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : 'text'}
									name="data.{field.name}"
									value={field.value}
									disabled={!editable}
									class="border-line rounded-lg border px-3 py-2"
								/>
							{/if}
						</label>
					{/each}

					{#if data.item.kind === 'VIDEO'}
						<p class="text-muted text-xs">
							Hebergeurs acceptes : {data.providers.join(', ')}. L'adresse d'integration est
							reconstruite par nos soins : aucun parametre de suivi de l'adresse d'origine n'est
							conserve.
						</p>
					{/if}
				</div>
			</Panel>
		{/if}
	</div>

	<aside class="flex flex-col gap-6">
		<Panel title="Publication">
			<div class="flex flex-col gap-4">
				<label class="flex flex-col gap-1.5">
					<span class="text-sm font-semibold">Date de publication</span>
					<span class="text-muted text-xs">
						Une date future programme la parution : le media apparaitra de lui-meme.
					</span>
					<input
						type="datetime-local"
						name="publishedAt"
						value={dateTimeValue(data.item.publishedAt)}
						disabled={!editable}
						class="border-line rounded-lg border px-3 py-2"
					/>
				</label>

				{#if editable}
					<button
						type="submit"
						class="bg-ink text-paper hover:bg-coral-600 rounded-pill px-5 py-2.5 text-sm font-semibold transition-colors"
					>
						Enregistrer
					</button>
				{/if}
			</div>

			{#snippet footer()}
				{#if can(data.user, 'media.publish')}
					<div class="flex flex-wrap gap-2">
						{#if data.item.status === 'PUBLISHED' || data.item.status === 'SCHEDULED'}
							<button
								type="submit"
								formaction="?/unpublish"
								class="border-line hover:bg-paper rounded-pill border px-4 py-2 text-xs font-medium"
							>
								Repasser en brouillon
							</button>
						{:else}
							<button
								type="submit"
								formaction="?/publish"
								class="bg-ink text-paper rounded-pill px-4 py-2 text-xs font-semibold"
							>
								Publier
							</button>
						{/if}
					</div>
				{/if}
			{/snippet}
		</Panel>

		<Panel title="Illustration">
			<div class="flex flex-col gap-4">
				<label class="flex flex-col gap-1.5">
					<span class="text-sm font-semibold">Adresse de l'image</span>
					<input
						type="url"
						name="coverUrl"
						value={data.item.coverUrl ?? ''}
						disabled={!editable}
						class="border-line rounded-lg border px-3 py-2"
					/>
				</label>

				<label class="flex flex-col gap-1.5">
					<span class="text-sm font-semibold">Description de l'image</span>
					<span class="text-muted text-xs">
						Lue par les lecteurs d'ecran. Laissez vide si l'image est purement decorative.
					</span>
					<input
						name="coverAlt"
						value={data.item.coverAlt ?? ''}
						disabled={!editable}
						class="border-line rounded-lg border px-3 py-2"
					/>
				</label>

				{#if data.item.coverUrl}
					<img
						src={data.item.coverUrl}
						alt={data.item.coverAlt ?? ''}
						class="rounded-card w-full object-cover"
					/>
				{/if}
			</div>
		</Panel>

		<Panel title="Mots-cles">
			<label class="flex flex-col gap-1.5">
				<span class="sr-only">Mots-cles</span>
				<span class="text-muted text-xs">Separes par des virgules.</span>
				<input
					name="tags"
					value={data.item.tags}
					disabled={!editable}
					class="border-line rounded-lg border px-3 py-2"
				/>
			</label>
		</Panel>
	</aside>
</form>
