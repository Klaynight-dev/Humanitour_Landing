<script lang="ts">
	import Panel from '$components/admin/Panel.svelte';
	import { formatCount, formatShare } from '$lib/shared/format';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const base = $derived(`/admin/sondages/${data.survey.id}/redressement`);
</script>

<div class="flex flex-col gap-6">
	<Panel
		title="Répondants"
		description="Toutes les réponses viennent de forms.humanitour.fr, synchronisées sur ce site. Le redressement porte sur l'ensemble des réponses synchronisées."
	>
		<p class="tabular text-3xl font-semibold">{formatCount(data.respondents)}</p>
		<p class="text-muted mt-1 text-sm">
			répondant{data.respondents > 1 ? 's' : ''} à redresser.
			{#if data.respondents === 0}
				Rien à caler tant qu'aucune réponse n'est synchronisée : lancez une synchronisation depuis
				<a href="/admin/sondages/{data.survey.id}/openforms" class="text-coral-ink underline"
					>la fiche Openforms</a
				>.
			{/if}
		</p>
	</Panel>

	<Panel
		title="Variables de calage possibles"
		description="Seules les questions à réponse unique peuvent porter un calage : chaque répondant doit tomber dans une case, et une seule. La colonne « Recensement » indique la variable de l'Insee que le libellé des modalités évoque."
	>
		{#if data.questions.length === 0}
			<p class="text-sm">
				Aucune question de cette enquête ne peut porter un calage. Il faut une question à choix unique,
				croisable, avec des modalités déclarées : sexe, tranche d'âge, groupe socioprofessionnel,
				région.
			</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full min-w-xl text-sm">
					<thead class="text-muted text-left text-xs">
						<tr>
							<th scope="col" class="py-2 pr-3 font-semibold">Question</th>
							<th scope="col" class="px-3 py-2 font-semibold">Recensement</th>
							<th scope="col" class="px-3 py-2 text-right font-semibold">Valeurs manquantes</th>
							<th scope="col" class="py-2 pl-3 font-semibold">Retenue</th>
						</tr>
					</thead>
					<tbody>
						{#each data.questions as question (question.code)}
							<tr class="border-ink/10 border-t align-top">
								<th scope="row" class="py-2.5 pr-3 text-left font-medium">
									{question.label}
									<code class="bg-cream text-muted ml-1 rounded px-1.5 py-0.5 text-xs font-normal"
										>{question.code}</code
									>
								</th>
								<td class="px-3 py-2.5">
									{question.dimension ?? 'Aucune : cibles à saisir à la main'}
								</td>
								<td
									class="tabular px-3 py-2.5 text-right {question.missing > 0
										? 'text-danger font-semibold'
										: ''}"
								>
									{formatCount(question.missing)}
									{#if data.respondents > 0}
										<span class="text-muted font-normal"
											>({formatShare(question.missing / data.respondents)})</span
										>
									{/if}
								</td>
								<td class="py-2.5 pl-3">{question.selected ? 'Oui' : 'Non'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<p class="text-muted mt-4 text-xs">
				Une valeur manquante est un répondant qui n'a pas répondu à la question. Le calcul ne l'exclut
				pas : il garde un poids neutre sur cette variable, ce que l'onglet Calcul vous demande de
				confirmer.
			</p>
		{/if}

		{#snippet footer()}
			<a
				href="{base}/marges"
				class="bg-ink text-paper press rounded-pill inline-flex min-h-11 items-center px-5 py-2.5 text-sm font-semibold"
			>
				Fixer les marges
			</a>
		{/snippet}
	</Panel>

	{#if data.questions.length > 0 && data.respondents > 0}
		<Panel title="Structure de l'échantillon brut">
			<div class="grid gap-6 md:grid-cols-2">
				{#each data.questions as question (question.code)}
					<section>
						<h3 class="mb-2 text-sm font-semibold">{question.label}</h3>
						<table class="w-full text-sm">
							<caption class="sr-only">Répartition brute : {question.label}</caption>
							<thead class="text-muted text-left text-xs">
								<tr>
									<th scope="col" class="py-1 pr-3 font-semibold">Modalité</th>
									<th scope="col" class="px-3 py-1 text-right font-semibold">Effectif</th>
									<th scope="col" class="py-1 pl-3 text-right font-semibold">Part</th>
								</tr>
							</thead>
							<tbody>
								{#each question.rows as row (row.key)}
									<tr class="border-ink/10 border-t">
										<th scope="row" class="py-1.5 pr-3 text-left font-normal">{row.label}</th>
										<td class="tabular px-3 py-1.5 text-right">{formatCount(row.count)}</td>
										<td class="tabular py-1.5 pl-3 text-right">{formatShare(row.share)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</section>
				{/each}
			</div>
		</Panel>
	{/if}
</div>
