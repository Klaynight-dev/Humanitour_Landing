<script lang="ts">
	import MediaCard from '$components/MediaCard.svelte';
	import { MEDIA_TYPES } from '$lib/shared/media';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const countFor = $derived((key: string) => data.counts.find((c) => c.key === key)?.count ?? 0);
</script>

<svelte:head>
	<title>Médias — Humanitour</title>
	<meta
		name="description"
		content="Articles, reportages vidéo, podcasts et revue de presse d'Humanitour. Les voix derrière les chiffres."
	/>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-14 sm:px-6">
	<header class="max-w-3xl">
		<p class="text-coral-600 text-sm font-semibold tracking-[0.2em] uppercase">Médias</p>
		<h1 class="font-display mt-3 text-4xl font-semibold sm:text-5xl">
			Les voix derrière les chiffres
		</h1>
		<p class="text-ink-soft mt-5 text-lg">
			Un pourcentage ne dit pas pourquoi quelqu'un vote comme il vote. Les échanges recueillis sur
			le terrain, eux, le racontent.
		</p>
	</header>

	<!-- Filtres par nature, en une rangee, avant la grille. -->
	<nav class="mt-10 flex flex-wrap gap-2" aria-label="Filtrer par nature de média">
		<a
			href="/medias"
			aria-current={data.activeKind === null ? 'page' : undefined}
			class="border-ink rounded-pill border-2 px-4 py-2 text-sm font-bold {data.activeKind === null
				? 'bg-ink text-white'
				: 'bg-paper text-ink'}"
		>
			Tout ({data.total})
		</a>
		{#each MEDIA_TYPES as type (type.key)}
			{#if countFor(type.key) > 0}
				<a
					href="/medias?type={type.key}"
					aria-current={data.activeKind === type.key ? 'page' : undefined}
					class="border-ink rounded-pill border-2 px-4 py-2 text-sm font-bold {data.activeKind ===
					type.key
						? 'bg-ink text-white'
						: 'bg-paper text-ink'}"
				>
					{type.plural} ({countFor(type.key)})
				</a>
			{/if}
		{/each}
	</nav>

	{#if data.items.length === 0}
		<p class="brut bg-surface rounded-card mt-10 p-8 text-center">
			{#if data.activeKind}
				Aucun média de cette nature pour l'instant.
			{:else}
				La médiathèque se remplira au fil du tour. Les échanges sont enregistrés, le montage suit.
			{/if}
		</p>
	{:else}
		<ul class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.items as media (media.slug)}
				<li><MediaCard {media} /></li>
			{/each}
		</ul>
	{/if}
</div>
