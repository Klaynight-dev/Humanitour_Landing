<script lang="ts">
	import { enhance } from '$app/forms';
	import EmptyState from '$components/admin/EmptyState.svelte';
	import PageHeader from '$components/admin/PageHeader.svelte';
	import Panel from '$components/admin/Panel.svelte';
	import StatusBadge from '$components/admin/StatusBadge.svelte';
	import { formatCount, formatDate } from '$lib/shared/format';
	import { can } from '$lib/shared/permissions';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let creating = $state(false);
</script>

<svelte:head><title>Sondages — Back-office</title></svelte:head>

<PageHeader
	title="Sondages"
	description="Chaque enquete porte son questionnaire, ses reponses et sa methodologie."
>
	{#snippet actions()}
		{#if can(data.user, 'survey.write')}
			<button
				type="button"
				onclick={() => (creating = !creating)}
				class="bg-ink text-white brut-sm brut-press rounded-pill px-4 py-2 text-sm font-bold"
			>
				{creating ? 'Annuler' : 'Nouvelle enquete'}
			</button>
		{/if}
	{/snippet}
</PageHeader>

{#if form?.message}
	<p
		role="status"
		class="brut bg-paper rounded-card mb-5 px-4 py-3 text-sm"
	>
		{form.message}
	</p>
{/if}

{#if creating && can(data.user, 'survey.write')}
	<div class="mb-6">
		<Panel
			title="Nouvelle enquete"
			description="L'adresse publique est deduite du titre. Elle ne changera plus une fois l'enquete publiee."
		>
			<form method="POST" action="?/create" use:enhance class="flex flex-wrap items-end gap-3">
				<label class="flex min-w-64 flex-1 flex-col gap-1.5">
					<span class="text-sm font-semibold">Titre de l'enquete</span>
					<input
						name="title"
						required
						minlength="3"
						placeholder="Presidentielle 2027 — le tour de France"
						class="border-ink bg-paper rounded-lg border-2 px-3 py-2"
					/>
				</label>
				<button
					type="submit"
					class="bg-ink text-white brut brut-press rounded-pill px-5 py-2.5 text-sm font-bold"
				>
					Creer
				</button>
			</form>
		</Panel>
	</div>
{/if}

{#if data.surveys.length === 0}
	<EmptyState
		title="Aucune enquete"
		description="Creez une enquete, ajoutez-lui des questions, puis importez les reponses recueillies sur le terrain."
	/>
{:else}
	<div class="border-ink bg-paper rounded-card overflow-x-auto border">
		<table class="w-full min-w-[44rem] border-collapse text-sm">
			<thead>
				<tr class="border-ink bg-surface border-b text-left">
					<th scope="col" class="px-5 py-3 font-semibold">Enquete</th>
					<th scope="col" class="px-3 py-3 font-semibold">Statut</th>
					<th scope="col" class="px-3 py-3 text-right font-semibold">Questions</th>
					<th scope="col" class="px-3 py-3 text-right font-semibold">Reponses</th>
					<th scope="col" class="px-5 py-3 text-right font-semibold">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each data.surveys as survey (survey.id)}
					<tr class="border-ink border-b last:border-0">
						<td class="px-5 py-3">
							<a href="/admin/sondages/{survey.id}" class="font-semibold hover:underline">
								{survey.title}
							</a>
							<p class="text-muted mt-0.5 text-xs">
								/donnees/{survey.slug} · modifie le {formatDate(survey.updatedAt)}
							</p>
						</td>
						<td class="px-3 py-3"><StatusBadge status={survey.status} /></td>
						<td class="tabular px-3 py-3 text-right">{formatCount(survey.questionCount)}</td>
						<td class="tabular px-3 py-3 text-right">{formatCount(survey.responseCount)}</td>
						<td class="px-5 py-3">
							<div class="flex flex-wrap justify-end gap-2">
								{#if can(data.user, 'survey.import')}
									<a
										href="/admin/sondages/{survey.id}/import"
										class="border-ink brut-sm brut-press bg-paper rounded-pill border-2 px-3 py-1.5 text-xs font-medium"
									>
										Importer
									</a>
								{/if}

								{#if can(data.user, 'survey.publish')}
									{#if survey.status === 'PUBLISHED'}
										<form method="POST" action="?/unpublish" use:enhance>
											<input type="hidden" name="id" value={survey.id} />
											<button
												type="submit"
												class="border-ink brut-sm brut-press bg-paper rounded-pill border-2 px-3 py-1.5 text-xs font-medium"
											>
												Depublier
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
													: 'Renseignez la methodologie et au moins une question avant de publier.'}
												class="bg-ink text-white brut-sm brut-press rounded-pill px-3 py-1.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
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
			</tbody>
		</table>
	</div>
{/if}
