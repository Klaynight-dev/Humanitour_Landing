<script lang="ts">
	import Button from '$components/Button.svelte';
	import ContentBlocks from '$components/ContentBlocks.svelte';
	import DatasetCard from '$components/DatasetCard.svelte';
	import { reveal } from '$lib/actions/reveal';
	import { formatCount } from '$shared/format';
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
	Catalogue, et non page de chiffres : il se parcourt comme la mediatheque. Le
	registre « chiffres » commence a la fiche d'une enquete, la ou un resultat
	s'affiche.

	L'en-tete, les textes d'etat vide et la note de licence sont edites au
	back-office ; la recherche, les filtres et la liste restent ici. C'est
	volontaire : `?q=` et `?theme=` sont des adresses partagees et citees par des
	tiers (AGENTS.md § 1.4), elles ne peuvent pas dependre d'une saisie.
-->
{#snippet controls()}
	<!--
		Recherche en formulaire GET : chaque recherche a son adresse, donc elle se
		partage, et elle fonctionne sans JavaScript.
	-->
	<form method="GET" class="flex flex-wrap items-end gap-3" role="search">
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
			Filtres par theme. Ce sont des liens et non des boutons : chaque theme a
			son adresse, donc il se partage et fonctionne sans JavaScript.
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

	{#if data.surveys.length === 0 && (data.search || data.theme)}
		<!-- Une recherche sans resultat n'est pas une erreur : elle dit ou elle a
		     cherche, pour qu'on sache quoi essayer ensuite. Ce texte-la cite les
		     termes cherches, il reste donc ecrit ici et non au back-office. -->
		<div class="bg-paper rounded-block mt-8 p-8 sm:p-12">
			<h2 class="text-2xl">Aucune enquête ne correspond</h2>
			<p class="measure mt-4 leading-relaxed">
				{#if data.search}
					La recherche porte sur les titres, les descriptions et le libellé des questions. Aucun de
					ces textes ne contient « {data.search} ».
				{:else}
					Aucune enquête publiée ne porte le thème « {data.theme} ».
				{/if}
			</p>
			<div class="mt-7">
				<Button href="/donnees">Voir toutes les enquêtes</Button>
			</div>
		</div>
	{/if}
{/snippet}

{#snippet list()}
	<ul class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
		<!--
			MOTION : les cartes entrent l'une apres l'autre, une seule fois. Le
			decalage est plafonne a la premiere rangee.
		-->
		{#each data.surveys as survey, index (survey.slug)}
			<li use:reveal={(index % 3) * 110}><DatasetCard {survey} /></li>
		{/each}
	</ul>
{/snippet}

<ContentBlocks
	blocks={data.blocks}
	tokens={data.tokens}
	team={data.team}
	catalogue={{
		// Une recherche infructueuse a deja son texte ci-dessus : l'etat vide edite
		// au back-office est celui du catalogue entier, pas celui d'un filtre.
		empty: data.surveys.length === 0 && !data.search && !data.theme,
		controls,
		body: list
	}}
/>
