<script lang="ts">
	import { getChart } from '$charts';
	import { formatBase, formatCount, formatFieldwork } from '$lib/shared/format';
	import { LICENSES } from '$lib/shared/site';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const chart = $derived(getChart(data.selection.chart));

	/**
	 * Construit une URL d explorateur en ne changeant qu un parametre.
	 *
	 * Les autres sont conserves : changer de graphique ne doit pas perdre le
	 * croisement en cours, ni l affichage des non-reponses.
	 */
	function exploreUrl(changes: Record<string, string | null>): string {
		// Instance locale et jetee a la fin de l'appel : elle ne porte aucun etat
		// reactif, la version reactive de Svelte n'apporterait rien ici.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const params = new URLSearchParams();
		params.set('x', data.selection.x);
		if (data.selection.y) params.set('y', data.selection.y);
		params.set('chart', data.selection.chart);
		if (!data.selection.includeNonResponses) params.set('nr', '0');

		for (const [key, value] of Object.entries(changes)) {
			if (value === null) {
				params.delete(key);
				continue;
			}
			params.set(key, value);
		}

		return `?${params.toString()}`;
	}

	const suppressed = $derived(
		data.result.shape === 'crosstab'
			? data.result.crosstab.suppressedCount
			: data.result.distribution.suppressedCount
	);
</script>

<svelte:head>
	<title>{data.survey.title} — Humanitour</title>
	<meta name="description" content={data.survey.subtitle ?? data.survey.title} />
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
	<nav class="text-muted mb-6 text-sm" aria-label="Fil d'Ariane">
		<a href="/donnees" class="hover:text-ink underline">Les donnees</a>
		<span aria-hidden="true"> / </span>
		<span>{data.survey.title}</span>
	</nav>

	<header class="max-w-3xl">
		<h1 class="font-display text-4xl font-semibold sm:text-5xl">{data.survey.title}</h1>
		{#if data.survey.subtitle}
			<p class="text-ink-soft mt-3 text-lg">{data.survey.subtitle}</p>
		{/if}
		<p class="text-muted mt-4 text-sm">
			{formatFieldwork(data.survey.fieldworkStart, data.survey.fieldworkEnd)}
			· {formatCount(data.survey.responseCount)} reponses recueillies
		</p>
	</header>

	{#if data.survey.description}
		<p class="text-ink-soft mt-6 max-w-3xl">{data.survey.description}</p>
	{/if}

	<!-- Explorateur -->
	<section class="mt-12" aria-labelledby="explorateur">
		<h2 id="explorateur" class="font-display text-2xl font-semibold">Explorer</h2>
		<p class="text-muted mt-1 text-sm">
			Choisissez une question, ajoutez-en une seconde pour la croiser, puis partagez l'adresse de
			la page : elle reste valable.
		</p>

		<!-- Les filtres tiennent sur une rangee au-dessus du graphique. Formulaire
		     GET : l'explorateur fonctionne sans JavaScript et chaque etat a son URL. -->
		<form method="GET" class="brut bg-surface rounded-card mt-6 p-5">
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<label class="flex flex-col gap-1.5">
					<span class="text-xs font-semibold tracking-wide uppercase">Question</span>
					<select
						name="x"
						class="border-ink bg-paper rounded-lg border-2 px-3 py-2 text-sm"
						value={data.selection.x}
					>
						{#each data.questions.filter((q) => q.isCrossable) as question (question.code)}
							<option value={question.code}>{question.label}</option>
						{/each}
					</select>
				</label>

				<label class="flex flex-col gap-1.5">
					<span class="text-xs font-semibold tracking-wide uppercase">Croiser avec</span>
					<select
						name="y"
						class="border-ink bg-paper rounded-lg border-2 px-3 py-2 text-sm"
						value={data.selection.y ?? ''}
					>
						<option value="">Aucun croisement</option>
						{#each data.questions.filter((q) => q.isCrossable && q.code !== data.selection.x) as question (question.code)}
							<option value={question.code}>{question.label}</option>
						{/each}
					</select>
				</label>

				<label class="flex flex-col gap-1.5">
					<span class="text-xs font-semibold tracking-wide uppercase">Affichage</span>
					<select
						name="chart"
						class="border-ink bg-paper rounded-lg border-2 px-3 py-2 text-sm"
						value={data.selection.chart}
					>
						{#each data.charts as option (option.key)}
							<option value={option.key}>{option.label}</option>
						{/each}
					</select>
				</label>

				<div class="flex items-end gap-3">
					<label class="flex items-center gap-2 pb-2 text-sm">
						<input
							type="checkbox"
							name="nr"
							value="1"
							checked={data.selection.includeNonResponses}
							class="accent-coral-500 h-4 w-4"
						/>
						<span>Afficher les non-reponses</span>
					</label>
					<button
						type="submit"
						class="bg-ink text-white brut brut-press rounded-pill px-5 py-2.5 text-sm font-bold"
					>
						Afficher
					</button>
				</div>
			</div>
		</form>

		<!-- Graphique -->
		<div class="brut rounded-card bg-paper mt-6 p-6 sm:p-8">
			{#if chart}
				{@const Chart = chart.component}
				{#if data.result.shape === 'crosstab'}
					<Chart
						data={data.result.crosstab}
						xLabel={data.selection.xLabel}
						yLabel={data.selection.yLabel}
					/>
				{:else}
					<Chart data={data.result.distribution} question={data.selection.xLabel} />
				{/if}
			{/if}

			<footer class="border-ink text-muted mt-8 flex flex-col gap-2 border-t pt-4 text-xs">
				<p>
					{#if data.result.shape === 'crosstab'}
						{formatBase(data.result.crosstab.respondents)} ayant repondu aux deux questions.
					{:else}
						{formatBase(data.result.distribution.respondents)}.
					{/if}
					Effectifs bruts, sans ponderation ni redressement.
				</p>
				{#if suppressed > 0}
					<p>
						{suppressed}
						{suppressed > 1 ? 'cases sont masquees' : 'case est masquee'} : elles portent sur moins
						de {data.threshold} repondants. Les publier permettrait d'identifier une personne.
					</p>
				{/if}
			</footer>
		</div>

		<!-- Autres affichages disponibles, en un clic, sans perdre le croisement. -->
		<div class="mt-4 flex flex-wrap gap-2">
			{#each data.charts as option (option.key)}
				<a
					href={exploreUrl({ chart: option.key })}
					aria-current={option.key === data.selection.chart ? 'true' : undefined}
					class="border-ink bg-paper rounded-pill border-2 px-3.5 py-1.5 text-xs font-medium"
					class:bg-ink={option.key === data.selection.chart}
					class:text-paper={option.key === data.selection.chart}
				>
					{option.label}
				</a>
			{/each}
		</div>
	</section>

	<!-- Methodologie -->
	{#if data.survey.methodology}
		<section class="mt-16 max-w-3xl" aria-labelledby="methodologie">
			<h2 id="methodologie" class="font-display text-2xl font-semibold">Methodologie</h2>
			<p class="text-ink-soft mt-4 leading-relaxed whitespace-pre-line">
				{data.survey.methodology}
			</p>
		</section>
	{/if}

	<!-- Donnees brutes -->
	<section class="brut bg-surface rounded-card mt-16 p-8" aria-labelledby="brut">
		<h2 id="brut" class="font-display text-2xl font-semibold">Les donnees brutes</h2>
		<p class="text-ink-soft mt-3 max-w-2xl">
			Le jeu complet, reponse par reponse, sans compte ni inscription. C'est ce que les instituts
			prives ne publient pas.
		</p>
		<div class="mt-6 flex flex-wrap gap-3">
			<a
				href="/donnees/{data.survey.slug}/export.csv"
				class="bg-ink text-white brut brut-press rounded-pill px-5 py-2.5 text-sm font-bold"
			>
				Telecharger en CSV
			</a>
			<a
				href="/donnees/{data.survey.slug}/export.json"
				class="border-ink hover:bg-ink hover:text-paper rounded-pill border-2 px-5 py-2.5 text-sm font-semibold transition-colors"
			>
				Telecharger en JSON
			</a>
		</div>
		<p class="text-muted mt-4 text-xs">
			Sous licence
			<a class="underline" href={LICENSES.data.url} target="_blank" rel="noopener noreferrer">
				{LICENSES.data.name}
			</a>. Citez Humanitour et rouvrez vos derives.
		</p>
	</section>
</div>
