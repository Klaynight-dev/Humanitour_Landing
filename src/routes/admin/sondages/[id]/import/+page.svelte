<script lang="ts">
	import { enhance } from '$app/forms';
	import EmptyState from '$components/admin/EmptyState.svelte';
	import PageHeader from '$components/admin/PageHeader.svelte';
	import Panel from '$components/admin/Panel.svelte';
	import StatusBadge from '$components/admin/StatusBadge.svelte';
	import { formatCount, formatDate } from '$lib/shared/format';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const accepted = <T,>(list: readonly T[]) => list;

	/** Valeur d'apercu d'une colonne, sur les premieres lignes du fichier. */
	function sampleFor(column: string): string {
		if (!data.active) return '';
		return data.active.sample
			.map((row) => String((row as Record<string, unknown>)[column] ?? ''))
			.filter((value) => value !== '')
			.slice(0, 2)
			.join(' · ');
	}
</script>

<svelte:head><title>Importer — {data.survey.title}</title></svelte:head>

<PageHeader
	title="Importer des reponses"
	breadcrumb={[
		{ label: 'Sondages', href: '/admin/sondages' },
		{ label: data.survey.title, href: `/admin/sondages/${data.survey.id}` }
	]}
	description="Deposer, verifier, confirmer. Rien n'entre en base avant la confirmation."
/>

{#if form?.message}
	<p role="status" class="brut bg-paper rounded-card mb-5 px-4 py-3 text-sm">
		{form.message}
	</p>
{/if}

{#if !data.active}
	<div class="flex flex-col gap-6">
		<Panel
			title="Deposer un fichier"
			description="Le fichier d'origine est conserve : c'est lui qui fait foi si un resultat publie est conteste."
		>
			<form
				method="POST"
				action="?/upload"
				enctype="multipart/form-data"
				use:enhance
				class="flex flex-wrap items-end gap-3"
			>
				<label class="flex min-w-64 flex-1 flex-col gap-1.5">
					<span class="text-sm font-semibold">Fichier de reponses</span>
					<span class="text-muted text-xs">
						Formats acceptes : {data.formats.map((f) => f.label).join(', ')}. 20 Mo maximum.
					</span>
					<input
						type="file"
						name="file"
						required
						accept={data.formats.flatMap((f) => f.extensions).join(',')}
						class="border-ink bg-paper rounded-lg border-2 px-3 py-2 text-sm"
					/>
				</label>
				<button
					type="submit"
					class="bg-ink text-white brut brut-press rounded-pill px-5 py-2.5 text-sm font-bold"
				>
					Deposer
				</button>
			</form>

			<p class="text-muted mt-4 text-xs">
				Un fichier contenant une colonne directement identifiante — courriel, telephone, nom,
				adresse — sera refuse en entier. Retirez-la avant de deposer.
			</p>
		</Panel>

		<Panel title="Historique des imports">
			{#if data.batches.length === 0}
				<EmptyState
					title="Aucun import"
					description="Les lots deposes apparaitront ici, avec leur nombre de lignes acceptees et refusees."
				/>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full min-w-[40rem] border-collapse text-sm">
						<thead>
							<tr class="border-ink border-b text-left">
								<th scope="col" class="py-2 pr-3 font-semibold">Fichier</th>
								<th scope="col" class="px-3 py-2 font-semibold">Statut</th>
								<th scope="col" class="px-3 py-2 text-right font-semibold">Acceptees</th>
								<th scope="col" class="px-3 py-2 text-right font-semibold">Refusees</th>
								<th scope="col" class="py-2 pl-3 text-right font-semibold">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each data.batches as batch (batch.id)}
								<tr class="border-ink border-b last:border-0">
									<td class="py-2.5 pr-3">
										<p class="font-medium">{batch.filename}</p>
										<p class="text-muted text-xs">
											{formatDate(batch.createdAt)}
											{#if batch.author}· {batch.author}{/if}
										</p>
									</td>
									<td class="px-3 py-2.5"><StatusBadge status={batch.status} /></td>
									<td class="tabular px-3 py-2.5 text-right">
										{formatCount(batch.acceptedCount)}
									</td>
									<td class="tabular px-3 py-2.5 text-right">
										{formatCount(batch.rejectedCount)}
									</td>
									<td class="py-2.5 pl-3">
										<div class="flex justify-end gap-2">
											{#if batch.status !== 'COMMITTED'}
												<a
													href="?lot={batch.id}"
													class="border-ink bg-paper rounded-pill border-2 px-2.5 py-1 text-xs"
												>
													Reprendre
												</a>
											{/if}
											<form method="POST" action="?/discard" use:enhance>
												<input type="hidden" name="batchId" value={batch.id} />
												<button
													type="submit"
													class="border-ink text-danger bg-paper rounded-pill border-2 px-2.5 py-1 text-xs"
													title={batch.status === 'COMMITTED'
														? 'Supprime aussi les reponses issues de ce lot.'
														: undefined}
												>
													Annuler
												</button>
											</form>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</Panel>
	</div>
{:else}
	<div class="flex flex-col gap-6">
		<Panel
			title="Correspondance des colonnes"
			description="Associez chaque question a une colonne du fichier. Les questions laissees vides ne seront pas importees."
		>
			<p class="text-muted mb-4 text-sm">
				<strong>{data.active.filename}</strong> — {formatCount(data.active.rowCount)} lignes,
				{data.active.columns.length} colonnes.
			</p>

			<form method="POST" action="?/preview" use:enhance class="flex flex-col gap-3">
				<input type="hidden" name="batchId" value={data.active.id} />

				{#each data.questions as question (question.code)}
					<div class="border-ink flex flex-wrap items-center gap-3 rounded-lg border-2 p-3">
						<div class="min-w-0 flex-1">
							<p class="text-sm font-medium">{question.label}</p>
							<code class="text-muted bg-surface rounded px-1.5 py-0.5 text-xs">
								{question.code}
							</code>
						</div>

						<label class="flex flex-col gap-1">
							<span class="sr-only">Colonne pour « {question.label} »</span>
							<select
								name="map:{question.code}"
								class="border-ink bg-paper min-w-48 rounded-lg border-2 px-2.5 py-1.5 text-sm"
							>
								<option value="">— ne pas importer —</option>
								{#each data.active.columns as column (column)}
									<option value={column} selected={data.active.mapping[question.code] === column}>
										{column}
										{#if sampleFor(column)}({sampleFor(column)}){/if}
									</option>
								{/each}
							</select>
						</label>
					</div>
				{/each}

				<div class="mt-2 flex flex-wrap gap-2">
					<button
						type="submit"
						class="bg-ink text-white brut brut-press rounded-pill px-5 py-2.5 text-sm font-bold"
					>
						Verifier
					</button>
					<a
						href="/admin/sondages/{data.survey.id}/import"
						class="border-ink brut-sm brut-press bg-paper rounded-pill border-2 px-5 py-2.5 text-sm font-medium"
					>
						Retour
					</a>
				</div>
			</form>
		</Panel>

		{#if data.active.status === 'VALIDATED' || data.active.rejectedCount > 0}
			<Panel
				title="Resultat de la verification"
				description="Rien n'est encore entre en base."
			>
				<div class="flex flex-wrap gap-8">
					<div>
						<p class="tabular font-display text-3xl font-semibold">
							{formatCount(data.active.acceptedCount)}
						</p>
						<p class="text-muted text-sm">lignes pretes</p>
					</div>
					<div>
						<p class="tabular font-display text-3xl font-semibold">
							{formatCount(data.active.rejectedCount)}
						</p>
						<p class="text-muted text-sm">lignes refusees</p>
					</div>
				</div>

				{#if data.active.errors.length > 0}
					<div class="mt-6">
						<h3 class="text-sm font-semibold">Pourquoi des lignes sont refusees</h3>
						<p class="text-muted mt-1 text-xs">
							Une ligne est acceptee ou refusee en entier : importer la moitie d'un
							questionnaire fausserait tous les croisements.
						</p>
						<ul class="mt-3 flex flex-col gap-1.5">
							{#each accepted(data.active.errors) as issue, index (index)}
								<li class="border-ink bg-paper rounded-lg border-2 px-3 py-2 text-xs">
									<span class="font-semibold">Ligne {issue.line}</span>
									<span class="text-muted">— colonne « {issue.column} »</span>
									{#if issue.value}<span class="text-muted"> — « {issue.value} »</span>{/if}
									<span class="block">{issue.reason}</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}

				{#snippet footer()}
					{#if data.active && data.active.acceptedCount > 0 && data.active.status !== 'COMMITTED'}
						<form method="POST" action="?/commit" use:enhance class="flex flex-wrap items-center gap-3">
							<input type="hidden" name="batchId" value={data.active.id} />
							<button
								type="submit"
								class="bg-ink text-white brut brut-press rounded-pill px-5 py-2.5 text-sm font-bold"
							>
								Confirmer l'import de {formatCount(data.active.acceptedCount)} reponses
							</button>
							<span class="text-muted text-xs">
								Les lignes refusees ne seront pas importees.
							</span>
						</form>
					{/if}
				{/snippet}
			</Panel>
		{/if}
	</div>
{/if}
