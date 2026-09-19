<script lang="ts">
	import Button from '$components/Button.svelte';
	import DatasetCard from '$components/DatasetCard.svelte';
	import { reveal } from '$lib/actions/reveal';
	import { formatCount } from '$shared/format';
	import { LICENSES } from '$shared/site';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const responses = $derived(
		data.surveys.reduce((total, survey) => total + survey.responseCount, 0)
	);
</script>

<svelte:head>
	<title>Les données, Humanitour</title>
	<meta
		name="description"
		content="Toutes les enquêtes d'Humanitour, leurs données brutes et leur méthodologie. Croisez les variables que vous voulez."
	/>
</svelte:head>

<!--
	Catalogue, et non page de chiffres : il se parcourt comme la mediatheque, avec
	la meme structure et le meme fond creme. Le registre « chiffres » commence a la
	fiche d une enquete, la ou un resultat s affiche.
-->
<div class="bg-cream">
	<div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
		<header>
			<h1 class="enter max-w-3xl text-4xl sm:text-5xl">
				Tout est publié. <span class="mark-brand">Croisez</span> ce que vous voulez.
			</h1>
			<p class="measure enter mt-6 text-lg leading-relaxed" style="--enter-delay: 90ms">
				Chaque enquête expose ses données brutes, sa méthodologie et ses effectifs. Aucun
				redressement n'est appliqué, les non-réponses sont comptées, et vous pouvez croiser
				n'importe quelle question avec n'importe quelle autre.
			</p>
		</header>

		<!--
			Recherche en formulaire GET : chaque recherche a son adresse, donc elle se
			partage, et elle fonctionne sans JavaScript.
		-->
		<form method="GET" class="mt-10 flex flex-wrap items-end gap-3" role="search">
			<label class="flex min-w-0 flex-1 flex-col gap-2">
				<span class="font-semibold">Chercher une enquête ou une question</span>
				<input
					type="search"
					name="q"
					value={data.search}
					placeholder="logement, pouvoir d'achat, abstention…"
					class="border-ink/20 rounded-field bg-paper min-h-11 w-full min-w-0 border px-4 py-2.5"
				/>
			</label>
			<button
				type="submit"
				class="bg-ink text-paper press rounded-pill min-h-11 px-6 py-2.5 font-semibold"
			>
				Chercher
			</button>
			{#if data.search}
				<a
					href="/donnees"
					class="text-muted hover:text-ink inline-flex min-h-11 items-center text-sm underline decoration-2 underline-offset-2"
				>
					Effacer
				</a>
			{/if}
		</form>

		{#if data.themes.length > 0}
			<!--
				Filtres par theme. Ce sont des liens et non des boutons : chaque
				theme a son adresse, donc il se partage et fonctionne sans
				JavaScript, comme les natures de media.
			-->
			<nav class="mt-6 flex flex-wrap gap-2" aria-label="Filtrer par thème">
				<a
					href="/donnees{data.search ? `?q=${encodeURIComponent(data.search)}` : ''}"
					aria-current={data.theme === '' ? 'page' : undefined}
					class="rounded-pill inline-flex min-h-11 items-center px-5 py-2.5 text-sm font-semibold {data.theme ===
					''
						? 'bg-ink text-paper'
						: 'bg-paper'}"
				>
					Tous les thèmes
				</a>
				{#each data.themes as entry (entry.theme)}
					<a
						href="/donnees?theme={encodeURIComponent(entry.theme)}{data.search
							? `&q=${encodeURIComponent(data.search)}`
							: ''}"
						aria-current={data.theme === entry.theme ? 'page' : undefined}
						class="rounded-pill inline-flex min-h-11 items-center px-5 py-2.5 text-sm font-semibold {data.theme ===
						entry.theme
							? 'bg-ink text-paper'
							: 'bg-paper'}"
					>
						{entry.theme} ({entry.count})
					</a>
				{/each}
			</nav>
		{/if}

		<p class="text-muted mt-4 text-sm" role="status">
			{#if data.search || data.theme}
				<span class="tabular">{data.surveys.length}</span>
				{data.surveys.length > 1 ? 'enquêtes correspondent' : 'enquête correspond'}
				{#if data.search}à « {data.search} »{/if}
				{#if data.search && data.theme},
				{/if}
				{#if data.theme}au thème « {data.theme} »{/if}.
			{:else if data.surveys.length > 0}
				<span class="tabular">{data.surveys.length}</span>
				{data.surveys.length > 1 ? 'enquêtes publiées' : 'enquête publiée'},
				<span class="tabular">{formatCount(responses)}</span> réponses au total.
			{/if}
		</p>

		{#if data.surveys.length === 0}
			<div class="bg-paper rounded-block mt-8 p-8 sm:p-12">
				{#if data.search || data.theme}
					<!-- Une recherche sans resultat n est pas une erreur : elle dit ou
					     elle a cherche, pour qu on sache quoi essayer ensuite. -->
					<h2 class="text-2xl">Aucune enquête ne correspond</h2>
					<p class="measure mt-4 leading-relaxed">
						{#if data.search}
							La recherche porte sur les titres, les descriptions et le libellé des questions. Aucun
							de ces textes ne contient « {data.search} ».
						{:else}
							Aucune enquête publiée ne porte le thème « {data.theme} ».
						{/if}
					</p>
					<div class="mt-7">
						<Button href="/donnees">Voir toutes les enquêtes</Button>
					</div>
				{:else}
					<h2 class="text-2xl">Les résultats arrivent</h2>
					<p class="measure mt-4 leading-relaxed">
						L'enquête de terrain est terminée et la saisie des réponses est en cours. Les jeux de
						données seront publiés ici, bruts et complets, dès qu'ils seront vérifiés.
					</p>
					<div class="mt-7 flex flex-wrap gap-3">
						<Button href="/le-tour">Comment l'enquête a été menée</Button>
						<Button href="/methodologie" variant="outline">Lire la méthodologie</Button>
					</div>
				{/if}
			</div>
		{:else}
			<ul class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				<!--
					MOTION : les cartes entrent l une apres l autre, une seule fois. Le
					decalage est plafonne a la premiere rangee, comme dans la
					mediatheque.
				-->
				{#each data.surveys as survey, index (survey.slug)}
					<li use:reveal={(index % 3) * 110}><DatasetCard {survey} /></li>
				{/each}
			</ul>
		{/if}

		<p class="text-muted measure mt-10 text-sm">
			Données diffusées sous
			<a
				class="underline decoration-2 underline-offset-2"
				href={LICENSES.data.url}
				target="_blank"
				rel="noopener noreferrer">{LICENSES.data.name}</a
			>
			: réutilisation libre, attribution obligatoire, partage à l'identique. Le catalogue est aussi
			<a class="underline decoration-2 underline-offset-2" href="/api/public/sondages">
				interrogeable en JSON
			</a>.
		</p>
	</div>
</div>
