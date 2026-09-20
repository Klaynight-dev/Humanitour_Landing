<script lang="ts">
	import { enhance } from '$app/forms';
	import EmptyState from '$components/admin/EmptyState.svelte';
	import FieldInput from '$components/admin/content/FieldInput.svelte';
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

	/**
	 * La section dont on ouvre le catalogue d'ajout, ou `null` pour la fin de
	 * page. Ajouter une section la ou on la veut evite d'en poser une neuvieme
	 * en bas d'une page et de la remonter case par case.
	 */
	let addingAfter: string | null = $state(null);

	/** Confirmation de suppression, par section : rien ne s'efface au premier clic. */
	let confirming: string | null = $state(null);
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
		{#if publishable}
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

{#snippet catalogue(after: string | null)}
	<!--
		Le catalogue des sections, range par famille. Chaque entree dit ce qu'elle
		fait : « Deux colonnes » ne se choisit pas sur son nom seul.
	-->
	<div class="panel flex flex-col gap-4 p-5">
		{#each data.blockLibrary as group (group.label)}
			<div>
				<p class="text-muted mb-2 text-xs font-semibold tracking-wide uppercase">{group.label}</p>
				<ul class="grid gap-2 sm:grid-cols-2">
					{#each group.types as type (type.key)}
						<li>
							<form method="POST" action="?/addBlock" use:enhance={() => {
								addingAfter = null;
								return async ({ update }) => update({ reset: false });
							}}>
								<input type="hidden" name="type" value={type.key} />
								<input type="hidden" name="after" value={after ?? ''} />
								<button
									type="submit"
									class="border-ink/15 hover:border-ink/40 rounded-field block w-full border p-3 text-left"
								>
									<span class="block text-sm font-semibold">{type.label}</span>
									<span class="text-muted block text-xs">{type.description}</span>
								</button>
							</form>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>
{/snippet}

<div class="grid gap-6 lg:grid-cols-[1fr_20rem]">
	<div class="flex flex-col gap-6">
		{#if data.blocks.length === 0}
			<EmptyState
				title="Page vide"
				description="Ajoutez une première section, ou réappliquez le modèle d'origine pour retrouver la page telle qu'elle a été composée."
			/>
		{/if}

		{#each data.blocks as block, index (block.id)}
			<Panel title={block.typeLabel} description="Section {index + 1} sur {data.blocks.length}">
				<form method="POST" action="?/saveBlock" use:enhance class="flex flex-col gap-4">
					<input type="hidden" name="id" value={block.id} />

					{#if block.fields.length === 0}
						<p class="text-warning text-sm">
							Cette section utilise un type qui n'existe plus (« {block.type} »). Elle ne s'affiche
							plus sur le site et n'est plus modifiable, seulement supprimable.
						</p>
					{/if}

					{#each block.fields as field (field.name)}
						<FieldInput
							{field}
							name="data.{field.name}"
							value={block.data[field.name]}
							library={data.library}
							disabled={!editable}
						/>
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
								aria-label="Monter cette section"
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
								aria-label="Descendre cette section"
							>
								↓
							</button>
							<button
								type="submit"
								formaction="?/duplicateBlock"
								class="border-ink/25 bg-paper press rounded-pill inline-flex min-h-11 items-center justify-center border px-4 py-2 text-sm"
							>
								Dupliquer
							</button>

							<!--
								La suppression demande une confirmation : la base est la source
								de ce que le site affiche, une section supprimee disparait de la
								page. Le modele d'origine reste le filet, mais il remet la page
								entiere, pas une section.
							-->
							{#if confirming === block.id}
								<button
									type="submit"
									formaction="?/deleteBlock"
									class="bg-danger text-paper press rounded-pill inline-flex min-h-11 items-center justify-center px-4 py-2 text-sm font-semibold"
								>
									Confirmer la suppression
								</button>
								<button
									type="button"
									onclick={() => (confirming = null)}
									class="border-ink/25 bg-paper press rounded-pill inline-flex min-h-11 items-center justify-center border px-4 py-2 text-sm"
								>
									Annuler
								</button>
							{:else}
								<button
									type="button"
									onclick={() => (confirming = block.id)}
									class="border-ink/25 text-danger bg-paper press rounded-pill inline-flex min-h-11 items-center justify-center border px-4 py-2 text-sm"
								>
									Supprimer
								</button>
							{/if}
						</div>
					{/if}
				</form>
			</Panel>

			{#if editable}
				<div class="flex flex-col gap-3">
					{#if addingAfter === block.id}
						{@render catalogue(block.id)}
						<button
							type="button"
							onclick={() => (addingAfter = null)}
							class="text-muted self-center text-sm underline"
						>
							Fermer
						</button>
					{:else}
						<button
							type="button"
							onclick={() => (addingAfter = block.id)}
							class="border-ink/20 text-muted hover:text-ink hover:border-ink/40 rounded-pill mx-auto inline-flex min-h-11 items-center border border-dashed px-5 text-sm font-semibold"
						>
							+ Ajouter une section ici
						</button>
					{/if}
				</div>
			{/if}
		{/each}

		{#if editable}
			<Panel
				title="Ajouter une section en fin de page"
				description="La bibliothèque des sections du site."
			>
				{@render catalogue(null)}
			</Panel>
		{/if}
	</div>

	<aside class="flex flex-col gap-6">
		<Panel title="État">
			<dl class="flex flex-col gap-3 text-sm">
				<div class="flex justify-between gap-3">
					<dt class="text-muted">Sur le site</dt>
					<dd class="font-semibold">
						{data.status === 'PUBLISHED' ? 'Cette version' : "Le modèle d'origine"}
					</dd>
				</div>
				<div class="flex justify-between gap-3">
					<dt class="text-muted">Sections</dt>
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

		{#if editable}
			<Panel title="Téléverser une image">
				<!--
					Formulaire a part, et non un champ de section : HTML interdit un
					formulaire dans un formulaire, et une image doit etre visible avant
					l'enregistrement de la section qui l'emploie. Une fois deposee, elle
					rejoint la bibliotheque et se choisit dans n'importe quelle section.
				-->
				<form
					method="POST"
					action="?/uploadImage"
					enctype="multipart/form-data"
					use:enhance
					class="flex flex-col gap-3"
				>
					<input
						type="file"
						name="fichier"
						accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
						class="text-sm"
					/>
					<button
						type="submit"
						class="border-ink/25 bg-paper press rounded-pill inline-flex min-h-11 items-center justify-center border px-4 py-2 text-sm font-semibold"
					>
						Téléverser
					</button>
					<p class="text-muted text-xs">
						JPEG, PNG, WebP, GIF ou AVIF, 8 Mo au maximum. Les dimensions sont relevées
						automatiquement pour réserver la place de l'image.
					</p>
				</form>
			</Panel>

			{#if data.hasTemplate}
				<Panel title="Modèle d'origine">
					<p class="text-muted text-sm">
						Remet la page telle qu'elle a été composée : la version de référence, écrite et
						relue, qui vit dans le code du site. Elle <strong>remplace</strong> les sections
						actuelles.
					</p>
					<form method="POST" action="?/applyTemplate" use:enhance class="mt-4">
						<button
							type="submit"
							class="border-ink/25 bg-paper press rounded-pill inline-flex min-h-11 items-center justify-center border px-4 py-2 text-sm font-semibold"
						>
							Réappliquer le modèle
						</button>
					</form>
				</Panel>
			{/if}
		{/if}

		<Panel title="Comment ça marche">
			<p class="text-muted text-sm">
				Ce que vous composez ici est ce que le site affiche, une fois la page publiée. Tant qu'elle
				ne l'est pas — ou si vous la dépubliez — le site sert son modèle d'origine.
			</p>
			<p class="text-muted mt-3 text-sm">
				Certains textes citent une valeur que le site applique vraiment, au lieu de la recopier :
			</p>
			<ul class="text-muted mt-2 flex flex-col gap-1 text-sm">
				{#each data.tokens as token (token.token)}
					<li><code class="bg-cream rounded px-1">{token.token}</code> — {token.label}</li>
				{/each}
			</ul>
		</Panel>
	</aside>
</div>
