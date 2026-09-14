<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '$components/admin/PageHeader.svelte';
	import Panel from '$components/admin/Panel.svelte';
	import StatusBadge from '$components/admin/StatusBadge.svelte';
	import { formatCount } from '$lib/shared/format';
	import { can } from '$lib/shared/permissions';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const editable = $derived(can(data.user, 'survey.write'));

	/** Une date ISO vers la valeur attendue par un champ `date`. */
	function dateValue(value: Date | null): string {
		return value ? new Date(value).toISOString().slice(0, 10) : '';
	}

	const typeLabel = $derived((key: string) =>
		data.questionTypes.find((type) => type.key === key)?.label ?? key
	);
</script>

<svelte:head><title>{data.survey.title} — Back-office</title></svelte:head>

<PageHeader
	title={data.survey.title}
	breadcrumb={[{ label: 'Sondages', href: '/admin/sondages' }]}
	description="Adresse publique : /donnees/{data.survey.slug}"
>
	{#snippet actions()}
		<StatusBadge status={data.survey.status} />
		{#if can(data.user, 'survey.import')}
			<a
				href="/admin/sondages/{data.survey.id}/import"
				class="bg-ink text-paper hover:bg-coral-600 rounded-pill px-4 py-2 text-sm font-semibold transition-colors"
			>
				Importer des reponses
			</a>
		{/if}
	{/snippet}
</PageHeader>

{#if form?.message}
	<p role="status" class="border-line bg-paper rounded-card mb-5 border px-4 py-3 text-sm">
		{form.message}
	</p>
{/if}

<div class="grid gap-6 lg:grid-cols-[1fr_20rem]">
	<div class="flex flex-col gap-6">
		<Panel
			title="Questionnaire"
			description="L'ordre ci-dessous est celui des questions sur la page publique."
		>
			{#if data.questions.length === 0}
				<p class="text-muted text-sm">
					Aucune question. Ajoutez-en une ci-dessous : le code sera deduit du libelle et entrera
					dans les permaliens de croisement.
				</p>
			{:else}
				<ul class="flex flex-col gap-2">
					{#each data.questions as question, index (question.id)}
						<li class="border-line rounded-lg border p-3">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="min-w-0">
									<p class="font-medium">{question.label}</p>
									<p class="text-muted mt-0.5 text-xs">
										<code class="bg-surface rounded px-1.5 py-0.5">{question.code}</code>
										<span class="ml-2">{typeLabel(question.type)}</span>
										{#if question.optionCount > 0}
											<span class="ml-2">{question.optionCount} modalites</span>
										{/if}
										{#if !question.isCrossable}
											<span class="text-orange-600 ml-2">non croisable</span>
										{/if}
									</p>
								</div>

								{#if editable}
									<div class="flex shrink-0 flex-wrap gap-1.5">
										<a
											href="/admin/sondages/{data.survey.id}/questions/{question.id}"
											class="border-line hover:bg-surface rounded-pill border px-2.5 py-1 text-xs"
										>
											Modifier
										</a>
										<form method="POST" action="?/moveQuestion" use:enhance>
											<input type="hidden" name="questionId" value={question.id} />
											<input type="hidden" name="direction" value="up" />
											<button
												type="submit"
												disabled={index === 0}
												class="border-line hover:bg-surface rounded-pill border px-2.5 py-1 text-xs disabled:opacity-30"
												aria-label="Monter « {question.label} »"
											>
												↑
											</button>
										</form>
										<form method="POST" action="?/moveQuestion" use:enhance>
											<input type="hidden" name="questionId" value={question.id} />
											<input type="hidden" name="direction" value="down" />
											<button
												type="submit"
												disabled={index === data.questions.length - 1}
												class="border-line hover:bg-surface rounded-pill border px-2.5 py-1 text-xs disabled:opacity-30"
												aria-label="Descendre « {question.label} »"
											>
												↓
											</button>
										</form>
										<form method="POST" action="?/deleteQuestion" use:enhance>
											<input type="hidden" name="questionId" value={question.id} />
											<button
												type="submit"
												class="border-danger/30 text-danger hover:bg-danger/5 rounded-pill border px-2.5 py-1 text-xs"
											>
												Supprimer
											</button>
										</form>
									</div>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			{/if}

			{#snippet footer()}
				{#if editable}
					<form
						method="POST"
						action="?/addQuestion"
						use:enhance
						class="flex flex-wrap items-end gap-2"
					>
						<label class="flex min-w-56 flex-1 flex-col gap-1">
							<span class="text-xs font-semibold">Libelle de la nouvelle question</span>
							<input
								name="label"
								required
								minlength="3"
								placeholder="Quelle est votre priorite pour la France ?"
								class="border-line bg-paper rounded-lg border px-3 py-2 text-sm"
							/>
						</label>
						<label class="flex flex-col gap-1">
							<span class="text-xs font-semibold">Type</span>
							<select
								name="type"
								class="border-line bg-paper rounded-lg border px-3 py-2 text-sm"
							>
								{#each data.questionTypes as type (type.key)}
									<option value={type.key}>{type.label}</option>
								{/each}
							</select>
						</label>
						<button
							type="submit"
							class="bg-ink text-paper rounded-pill px-4 py-2 text-sm font-semibold"
						>
							Ajouter
						</button>
					</form>
				{/if}
			{/snippet}
		</Panel>

		<Panel
			title="Methodologie"
			description="Obligatoire avant publication. C'est ce qui distingue cette enquete d'un sondage opaque."
		>
			<form method="POST" action="?/metadata" use:enhance class="flex flex-col gap-4">
				<div class="grid gap-4 sm:grid-cols-2">
					<label class="flex flex-col gap-1.5 sm:col-span-2">
						<span class="text-sm font-semibold">Titre</span>
						<input
							name="title"
							required
							value={data.survey.title}
							disabled={!editable}
							class="border-line rounded-lg border px-3 py-2"
						/>
					</label>

					<label class="flex flex-col gap-1.5 sm:col-span-2">
						<span class="text-sm font-semibold">Sous-titre</span>
						<input
							name="subtitle"
							value={data.survey.subtitle ?? ''}
							disabled={!editable}
							class="border-line rounded-lg border px-3 py-2"
						/>
					</label>

					<label class="flex flex-col gap-1.5">
						<span class="text-sm font-semibold">Debut du terrain</span>
						<input
							type="date"
							name="fieldworkStart"
							value={dateValue(data.survey.fieldworkStart)}
							disabled={!editable}
							class="border-line rounded-lg border px-3 py-2"
						/>
					</label>

					<label class="flex flex-col gap-1.5">
						<span class="text-sm font-semibold">Fin du terrain</span>
						<input
							type="date"
							name="fieldworkEnd"
							value={dateValue(data.survey.fieldworkEnd)}
							disabled={!editable}
							class="border-line rounded-lg border px-3 py-2"
						/>
					</label>
				</div>

				<label class="flex flex-col gap-1.5">
					<span class="text-sm font-semibold">Presentation</span>
					<textarea
						name="description"
						rows="3"
						disabled={!editable}
						class="border-line rounded-lg border px-3 py-2">{data.survey.description ?? ''}</textarea
					>
				</label>

				<label class="flex flex-col gap-1.5">
					<span class="text-sm font-semibold">
						Methodologie <span class="text-danger">*</span>
					</span>
					<span class="text-muted text-xs">
						Mode de collecte, construction de l'echantillon, limites connues. Publiee telle quelle.
					</span>
					<textarea
						name="methodology"
						rows="8"
						disabled={!editable}
						class="border-line rounded-lg border px-3 py-2">{data.survey.methodology ?? ''}</textarea
					>
				</label>

				<label class="flex flex-col gap-1.5">
					<span class="text-sm font-semibold">Seuil d'anonymat propre a cette enquete</span>
					<span class="text-muted text-xs">
						Laissez vide pour appliquer le reglage global. Ne le baissez que si vous savez ce que
						vous faites.
					</span>
					<input
						type="number"
						name="kAnonymityThreshold"
						min="1"
						value={data.survey.kAnonymityThreshold ?? ''}
						disabled={!editable}
						class="border-line w-32 rounded-lg border px-3 py-2"
					/>
				</label>

				{#if editable}
					<div>
						<button
							type="submit"
							class="bg-ink text-paper hover:bg-coral-600 rounded-pill px-5 py-2.5 text-sm font-semibold transition-colors"
						>
							Enregistrer
						</button>
					</div>
				{/if}
			</form>
		</Panel>
	</div>

	<aside class="flex flex-col gap-6">
		<Panel title="Etat">
			<dl class="flex flex-col gap-3 text-sm">
				<div class="flex justify-between gap-3">
					<dt class="text-muted">Reponses</dt>
					<dd class="tabular font-semibold">{formatCount(data.survey.responseCount)}</dd>
				</div>
				<div class="flex justify-between gap-3">
					<dt class="text-muted">Questions</dt>
					<dd class="tabular font-semibold">{formatCount(data.questions.length)}</dd>
				</div>
				<div class="flex justify-between gap-3">
					<dt class="text-muted">Methodologie</dt>
					<dd class="font-semibold">
						{data.survey.methodology?.trim() ? 'Renseignee' : 'Manquante'}
					</dd>
				</div>
			</dl>

			{#if data.survey.status === 'PUBLISHED'}
				<a
					href="/donnees/{data.survey.slug}"
					class="text-coral-700 mt-4 inline-block text-sm underline"
				>
					Voir la page publique
				</a>
			{/if}
		</Panel>
	</aside>
</div>
