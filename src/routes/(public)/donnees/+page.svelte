<script lang="ts">
	import Button from '$components/Button.svelte';
	import { formatCount, formatFieldwork } from '$lib/shared/format';
	import { LICENSES } from '$lib/shared/site';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Les données, Humanitour</title>
	<meta
		name="description"
		content="Toutes les enquêtes d'Humanitour, leurs données brutes et leur méthodologie. Croisez les variables que vous voulez."
	/>
</svelte:head>

<!--
	Registre des donnees : fond blanc, pas de degrade, pas d ombre. La page qui
	reproche aux autres d habiller leurs chiffres ne peut pas habiller les siens.
-->
<div class="bg-paper">
	<div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
		<header>
			<h1 class="max-w-3xl text-4xl sm:text-5xl">Tout est publié. Croisez ce que vous voulez.</h1>
			<p class="measure mt-6 text-lg leading-relaxed">
				Chaque enquête expose ses données brutes, sa méthodologie et ses effectifs. Aucun
				redressement n'est appliqué, les non-réponses sont comptées, et vous pouvez croiser
				n'importe quelle question avec n'importe quelle autre.
			</p>
			<p class="text-muted measure mt-4 text-sm">
				Données diffusées sous
				<a
					class="underline decoration-2 underline-offset-2"
					href={LICENSES.data.url}
					target="_blank"
					rel="noopener noreferrer">{LICENSES.data.name}</a
				> : réutilisation libre, attribution obligatoire, partage à l'identique.
			</p>
		</header>

		{#if data.surveys.length === 0}
			<!-- Etat vide : il dit pourquoi c est vide et ce qui vient ensuite, pas
			     seulement qu il n y a rien. -->
			<div class="bg-cream rounded-block mt-12 p-8 sm:p-12">
				<h2 class="text-2xl">Les résultats arrivent</h2>
				<p class="measure mt-4 leading-relaxed">
					L'enquête de terrain est terminée et la saisie des réponses est en cours. Les jeux de
					données seront publiés ici, bruts et complets, dès qu'ils seront vérifiés.
				</p>
				<div class="mt-7 flex flex-wrap gap-3">
					<Button href="/le-tour">Comment l'enquête a été menée</Button>
					<Button href="/methodologie" variant="outline">Lire la méthodologie</Button>
				</div>
			</div>
		{:else}
			<ul class="mt-12 grid gap-5 md:grid-cols-2">
				{#each data.surveys as survey (survey.slug)}
					<li>
						<a
							href="/donnees/{survey.slug}"
							class="bg-cream rounded-block press flex h-full flex-col p-6 sm:p-7"
						>
							<h2 class="text-xl font-semibold">{survey.title}</h2>
							{#if survey.subtitle}
								<p class="text-ink-soft mt-2">{survey.subtitle}</p>
							{/if}
							<p class="text-muted mt-4 text-sm">
								{formatFieldwork(survey.fieldworkStart, survey.fieldworkEnd)}
							</p>
							<div class="border-ink/15 mt-auto flex gap-8 border-t pt-4">
								<span class="text-sm">
									<span class="tabular font-semibold">{formatCount(survey.responseCount)}</span>
									<span class="text-muted">réponses</span>
								</span>
								<span class="text-sm">
									<span class="tabular font-semibold">{formatCount(survey.questionCount)}</span>
									<span class="text-muted">questions</span>
								</span>
							</div>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
