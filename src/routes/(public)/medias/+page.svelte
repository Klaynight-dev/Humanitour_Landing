<script lang="ts">
	import Button from '$components/Button.svelte';
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

<!-- Registre editorial et non registre de donnees : fond creme, cartes blanches. -->
<div class="bg-cream">
	<div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
		<header>
			<!-- Le mot marque, forme `mark-brand` : la surface est claire. La page
			     releve du registre editorial, pas du registre des chiffres : elle a
			     donc droit au motif et a l entree de couverture. -->
			<h1 class="enter max-w-3xl text-4xl sm:text-5xl">
				Les <span class="mark-brand">voix</span> derrière les chiffres
			</h1>
			<p class="measure enter mt-6 text-lg leading-relaxed" style="--enter-delay: 90ms">
				Un pourcentage ne dit pas pourquoi quelqu'un vote comme il vote. Les échanges recueillis sur
				le terrain, eux, le racontent.
			</p>
		</header>

		<!--
			Filtres par nature. Ce sont des liens et non des boutons : chaque filtre a
			sa propre adresse, donc il se partage et fonctionne sans JavaScript.
		-->
		<nav class="mt-10 flex flex-wrap gap-2" aria-label="Filtrer par nature de média">
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

		{#if data.items.length === 0}
			<div class="bg-paper rounded-block mt-10 p-8 sm:p-12">
				{#if data.activeKind}
					<h2 class="text-2xl">Rien de cette nature pour l'instant</h2>
					<p class="measure mt-4 leading-relaxed">
						Les autres formats sont peut-être déjà en ligne.
					</p>
					<div class="mt-7">
						<Button href="/medias">Voir toute la médiathèque</Button>
					</div>
				{:else}
					<h2 class="text-2xl">Le montage est en cours</h2>
					<p class="measure mt-4 leading-relaxed">
						Tous les entretiens du tour ont été enregistrés. Ils seront publiés ici au fil du
						montage, en articles, en vidéos et en podcasts.
					</p>
					<div class="mt-7">
						<Button href="/le-tour">Comment l'enquête a été menée</Button>
					</div>
				{/if}
			</div>
		{:else}
			<ul class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				<!--
					MOTION : les cartes entrent l une apres l autre, une seule fois. Le
					decalage est plafonne a la premiere rangee : au-dela, une grille de
					trente medias ferait attendre la derniere carte trois secondes apres
					la premiere.
				-->
				{#each data.items as media, index (media.slug)}
					<li use:reveal={(index % 3) * 110}><MediaCard {media} /></li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
