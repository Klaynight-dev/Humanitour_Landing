<script lang="ts">
	import { formatCount, formatFieldwork } from '$lib/shared/format';
	import { LICENSES } from '$lib/shared/site';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Les donnees — Humanitour</title>
	<meta
		name="description"
		content="Toutes les enquetes d'Humanitour, leurs donnees brutes et leur methodologie. Croisez les variables que vous voulez."
	/>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-14 sm:px-6">
	<header class="max-w-3xl">
		<p class="text-coral-600 text-sm font-semibold tracking-[0.2em] uppercase">Les donnees</p>
		<h1 class="font-display mt-3 text-4xl font-semibold sm:text-5xl">
			Tout est publie. Croisez ce que vous voulez.
		</h1>
		<p class="text-ink-soft mt-5 text-lg">
			Chaque enquete expose ses donnees brutes, sa methodologie et ses effectifs. Aucun
			redressement n'est applique, les non-reponses sont comptees, et vous pouvez croiser
			n'importe quelle question avec n'importe quelle autre.
		</p>
		<p class="text-muted mt-4 text-sm">
			Donnees diffusees sous
			<a class="underline" href={LICENSES.data.url} target="_blank" rel="noopener noreferrer">
				{LICENSES.data.name}
			</a>
			: reutilisation libre, attribution obligatoire, partage a l'identique.
		</p>
	</header>

	{#if data.surveys.length === 0}
		<p class="brut bg-surface rounded-card mt-12 p-8 text-center">
			Aucune enquete n'est encore publiee. Le tour est en cours.
		</p>
	{:else}
		<ul class="mt-12 grid gap-5 md:grid-cols-2">
			{#each data.surveys as survey (survey.slug)}
				<li>
					<a
						href="/donnees/{survey.slug}"
						class="brut brut-press bg-paper rounded-card flex h-full flex-col p-6"
					>
						<h2 class="font-display text-xl font-semibold">{survey.title}</h2>
						{#if survey.subtitle}
							<p class="text-ink-soft mt-2 text-sm">{survey.subtitle}</p>
						{/if}
						<p class="text-muted mt-4 text-xs">
							{formatFieldwork(survey.fieldworkStart, survey.fieldworkEnd)}
						</p>
						<div class="border-ink mt-auto flex gap-6 border-t-2 pt-4">
							<span class="tabular text-sm">
								<strong>{formatCount(survey.responseCount)}</strong>
								<span class="text-muted">reponses</span>
							</span>
							<span class="tabular text-sm">
								<strong>{formatCount(survey.questionCount)}</strong>
								<span class="text-muted">questions</span>
							</span>
						</div>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>
