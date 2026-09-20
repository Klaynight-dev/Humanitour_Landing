<script lang="ts">
	import { enhance } from '$app/forms';
	import { closeAfter } from '$components/admin/enhance';
	import Dialog from '$components/admin/Dialog.svelte';
	import FilterBar from '$components/admin/FilterBar.svelte';
	import Flash from '$components/admin/Flash.svelte';
	import PageHeader from '$components/admin/PageHeader.svelte';
	import Panel from '$components/admin/Panel.svelte';
	import StatusBadge from '$components/admin/StatusBadge.svelte';
	import Table from '$components/admin/Table.svelte';
	import { formatCount, formatDate } from '$lib/shared/format';
	import { can } from '$lib/shared/permissions';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let creating = $state(false);

	/**
	 * Enquete visee par une suppression, et recopie de son identifiant.
	 *
	 * Une enquete emporte ses reponses : la boite de dialogue dit ce qui part,
	 * et des qu il y a des reponses en jeu, elle demande de recopier
	 * l identifiant. On valide une confirmation par reflexe, on ne recopie pas
	 * un nom par reflexe.
	 */
	let deleteTarget: {
		id: string;
		title: string;
		slug: string;
		responseCount: number;
	} | null = $state(null);
	let confirmation = $state('');
	let deleteForm: HTMLFormElement | null = $state(null);

	const confirmed = $derived.by(() => {
		if (!deleteTarget || deleteTarget.responseCount === 0) return true;
		return confirmation.trim() === deleteTarget.slug;
	});

	function askDelete(survey: { id: string; title: string; slug: string; responseCount: number }) {
		confirmation = '';
		deleteTarget = survey;
	}
</script>

<svelte:head><title>Sondages, back-office</title></svelte:head>

<PageHeader
	title="Sondages"
	description="Chaque enquête porte son questionnaire, ses réponses et sa méthodologie."
>
	{#snippet actions()}
		{#if can(data.user, 'survey.write')}
			<button
				type="button"
				onclick={() => (creating = !creating)}
				class="bg-ink text-paper press rounded-pill px-4 py-2 text-sm font-semibold min-h-11 inline-flex items-center justify-center"
			>
				{creating ? 'Annuler' : 'Nouvelle enquête'}
			</button>
		{/if}
	{/snippet}
</PageHeader>

<Flash message={form?.message} />

{#if creating && can(data.user, 'survey.write')}
	<div class="mb-6">
		<Panel
			title="Nouvelle enquête"
			description="L'adresse publique est déduite du titre. Elle ne changera plus une fois l'enquête publiée."
		>
			<form method="POST" action="?/create" use:enhance class="flex flex-wrap items-end gap-3">
				<label class="flex min-w-64 flex-1 flex-col gap-1.5">
					<span class="text-sm font-semibold">Titre de l'enquête</span>
					<input
						name="title"
						required
						minlength="3"
						placeholder="Présidentielle 2027, le tour de France"
						class="border-ink/20 bg-paper rounded-field border px-3 py-2 min-h-11"
					/>
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

<FilterBar active={data.filters.search !== '' || data.filters.status !== null}>
	<label class="flex min-w-56 flex-1 flex-col gap-1.5">
		<span class="text-sm font-semibold">Rechercher</span>
		<input
			type="search"
			name="q"
			value={data.filters.search}
			placeholder="Titre ou adresse publique"
			class="border-ink/20 bg-paper rounded-field min-h-11 border px-3 py-2"
		/>
	</label>
	<label class="flex flex-col gap-1.5">
		<span class="text-sm font-semibold">Statut</span>
		<select name="statut" class="border-ink/20 bg-paper rounded-field min-h-11 border px-3 py-2">
			<option value="">Tous</option>
			<option value="DRAFT" selected={data.filters.status === 'DRAFT'}>Brouillon</option>
			<option value="PUBLISHED" selected={data.filters.status === 'PUBLISHED'}>Publié</option>
			<option value="ARCHIVED" selected={data.filters.status === 'ARCHIVED'}>Archivé</option>
		</select>
	</label>
</FilterBar>

<Table
	empty={data.surveys.length === 0}
	emptyTitle={data.filters.search !== '' || data.filters.status !== null
		? 'Aucune enquête ne correspond'
		: 'Aucune enquête'}
	emptyDescription={data.filters.search !== '' || data.filters.status !== null
		? 'Élargissez la recherche ou changez le statut demandé.'
		: 'Créez une enquête, ajoutez-lui des questions, puis importez les réponses recueillies sur le terrain.'}
	minWidth="44rem"
>
	{#snippet head()}
		<th scope="col" class="px-5 py-3 font-semibold">Enquête</th>
		<th scope="col" class="px-3 py-3 font-semibold">Statut</th>
		<th scope="col" class="px-3 py-3 text-right font-semibold">Questions</th>
		<th scope="col" class="px-3 py-3 text-right font-semibold">Réponses</th>
		<th scope="col" class="px-5 py-3 text-right font-semibold">Actions</th>
	{/snippet}
	{#snippet body()}
		{#each data.surveys as survey (survey.id)}
			<tr class="border-ink/12 border-b last:border-0">
				<td class="px-5 py-3">
					<a href="/admin/sondages/{survey.id}" class="font-semibold hover:underline">
						{survey.title}
					</a>
					<p class="text-muted mt-0.5 text-xs">
						/donnees/{survey.slug}, modifié le {formatDate(survey.updatedAt)}
					</p>
				</td>
				<td class="px-3 py-3"><StatusBadge status={survey.status} /></td>
				<td class="tabular px-3 py-3 text-right">{formatCount(survey.questionCount)}</td>
				<td class="tabular px-3 py-3 text-right">{formatCount(survey.responseCount)}</td>
				<td class="px-5 py-3">
					<div class="flex flex-wrap justify-end gap-2">
						{#if can(data.user, 'survey.sync')}
							<a
								href="/admin/sondages/{survey.id}/openforms"
								class="border-ink/25 press bg-paper rounded-pill border px-3 py-1.5 text-xs font-medium min-h-11 inline-flex items-center justify-center"
							>
								Openforms
							</a>
						{/if}

						{#if can(data.user, 'survey.delete')}
							<button
								type="button"
								disabled={survey.status === 'PUBLISHED'}
								onclick={() => askDelete(survey)}
								title={survey.status === 'PUBLISHED'
									? "Dépubliez l'enquête d'abord : son adresse est peut-être déjà citée ailleurs."
									: undefined}
								class="border-ink/25 text-danger bg-paper press rounded-pill border px-3 py-1.5 text-xs min-h-11 inline-flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-40"
							>
								Supprimer
							</button>
						{/if}

						{#if can(data.user, 'survey.publish')}
							{#if survey.status === 'PUBLISHED'}
								<form method="POST" action="?/unpublish" use:enhance>
									<input type="hidden" name="id" value={survey.id} />
									<button
										type="submit"
										class="border-ink/25 press bg-paper rounded-pill border px-3 py-1.5 text-xs font-medium min-h-11 inline-flex items-center justify-center"
									>
										Dépublier
									</button>
								</form>
							{:else}
								<form method="POST" action="?/publish" use:enhance>
									<input type="hidden" name="id" value={survey.id} />
									<button
										type="submit"
										disabled={!survey.canPublish}
										title={survey.canPublish
											? undefined
											: 'Renseignez la méthodologie et au moins une question avant de publier.'}
										class="bg-ink text-paper press rounded-pill px-3 py-1.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40 min-h-11 inline-flex items-center justify-center"
									>
										Publier
									</button>
								</form>
							{/if}
						{/if}
					</div>
				</td>
			</tr>
		{/each}
	{/snippet}
</Table>

<form
	bind:this={deleteForm}
	method="POST"
	action="?/delete"
	use:enhance={closeAfter(() => {
		deleteTarget = null;
		confirmation = '';
	})}
	class="hidden"
>
	<input type="hidden" name="id" value={deleteTarget?.id ?? ''} />
	<input type="hidden" name="confirmation" value={confirmation} />
</form>

<Dialog
	open={deleteTarget !== null}
	title="Supprimer cette enquête ?"
	onClose={() => (deleteTarget = null)}
>
	<p>
		« {deleteTarget?.title} » sera supprimée définitivement, avec ses questions, ses modalités, ses lots
		d'import et
		<strong>{formatCount(deleteTarget?.responseCount ?? 0)} réponse(s)</strong>. Les fichiers
		déposés lors des imports partent aussi. Rien n'est récupérable.
	</p>
	{#if (deleteTarget?.responseCount ?? 0) > 0}
		<label class="mt-4 flex flex-col gap-2">
			<span class="text-sm">
				Recopiez l'identifiant de l'enquête pour confirmer&nbsp;:
				<code class="font-semibold">{deleteTarget?.slug}</code>
			</span>
			<input
				type="text"
				bind:value={confirmation}
				autocomplete="off"
				spellcheck="false"
				class="border-ink/25 rounded-field bg-paper min-h-11 w-full border px-3 py-2"
			/>
		</label>
	{/if}
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
			disabled={!confirmed}
			onclick={() => deleteForm?.requestSubmit()}
			class="text-danger border-ink/25 press bg-paper rounded-pill border px-4 py-2 text-sm font-semibold min-h-11 inline-flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-40"
		>
			Supprimer définitivement
		</button>
	{/snippet}
</Dialog>
