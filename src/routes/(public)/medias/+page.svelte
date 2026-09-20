<script lang="ts">
	import Button from '$components/Button.svelte';
	import ContentBlocks from '$components/ContentBlocks.svelte';
	import MediaCard from '$components/MediaCard.svelte';
	import { reveal } from '$lib/actions/reveal';
	import { MEDIA_TYPES } from '$lib/shared/media';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const countFor = $derived((key: string) => data.counts.find((c) => c.key === key)?.count ?? 0);
</script>

<svelte:head>
	<title>Médias, Humanitour</title>
	<meta
		name="description"
		content="Articles, reportages vidéo, podcasts et revue de presse d'Humanitour. Les voix derrière les chiffres."
	/>
</svelte:head>

{#snippet controls()}
	<!--
		Filtres par nature. Ce sont des liens et non des boutons : chaque filtre a
		sa propre adresse, donc il se partage et fonctionne sans JavaScript. Ces
		adresses sont un contrat public, elles restent produites ici.
	-->
	<nav class="flex flex-wrap gap-2" aria-label="Filtrer par nature de média">
		<a
			href="/medias"
			aria-current={data.activeKind === null ? 'page' : undefined}
			class="rounded-pill inline-flex min-h-11 items-center px-5 py-2.5 text-sm font-semibold {data.activeKind ===
			null
				? 'bg-ink text-paper'
				: 'bg-paper'}"
		>
			Tout ({data.total})
		</a>
		{#each MEDIA_TYPES as type (type.key)}
			{#if countFor(type.key) > 0}
				<a
					href="/medias?type={type.key}"
					aria-current={data.activeKind === type.key ? 'page' : undefined}
					class="rounded-pill inline-flex min-h-11 items-center px-5 py-2.5 text-sm font-semibold {data.activeKind ===
					type.key
						? 'bg-ink text-paper'
						: 'bg-paper'}"
				>
					{type.plural} ({countFor(type.key)})
				</a>
			{/if}
		{/each}
	</nav>

	{#if data.items.length === 0 && data.activeKind}
		<!-- Un filtre sans resultat cite la nature demandee : ce texte-la depend de
		     ce qui a ete filtre, il reste donc ecrit ici. -->
		<div class="bg-paper rounded-block mt-10 p-8 sm:p-12">
			<h2 class="text-2xl">Rien de cette nature pour l'instant</h2>
			<p class="measure mt-4 leading-relaxed">Les autres formats sont peut-être déjà en ligne.</p>
			<div class="mt-7">
				<Button href="/medias">Voir toute la médiathèque</Button>
			</div>
		</div>
	{/if}
{/snippet}

{#snippet list()}
	<ul class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
		<!--
			MOTION : les cartes entrent l'une apres l'autre, une seule fois. Le
			decalage est plafonne a la premiere rangee : au-dela, une grille de trente
			medias ferait attendre la derniere carte trois secondes apres la premiere.
		-->
		{#each data.items as media, index (media.slug)}
			<li use:reveal={(index % 3) * 110}><MediaCard {media} /></li>
		{/each}
	</ul>
{/snippet}

<ContentBlocks
	blocks={data.blocks}
	tokens={data.tokens}
	team={data.team}
	catalogue={{
		empty: data.items.length === 0 && data.activeKind === null,
		controls,
		body: list
	}}
/>
