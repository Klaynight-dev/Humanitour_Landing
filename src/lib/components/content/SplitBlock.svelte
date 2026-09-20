<script lang="ts">
	import PolarstepsEmbed from '$components/PolarstepsEmbed.svelte';
	import RichText from '$components/RichText.svelte';
	import TourMap from '$components/TourMap.svelte';
	import { reveal } from '$lib/actions/reveal';
	import { SPACING_KEYS, SURFACE_KEYS } from '$lib/shared/content/blocks/common';
	import { DECK_PHOTOS, TOUR_PHOTOS } from '$lib/shared/photos';
	import Buttons from './Buttons.svelte';
	import { getContentContext } from './context';
	import Marked from './Marked.svelte';
	import { sectionReader } from './read';
	import Section from './Section.svelte';
	import { divideClass, mutedClass } from './surfaces';

	interface Props {
		id: string;
		data: Readonly<Record<string, unknown>>;
	}

	let { id, data }: Props = $props();

	const page = getContentContext();
	const read = $derived(sectionReader(data, page.tokens));

	const surface = $derived(read.choice('surface', SURFACE_KEYS, 'paper'));
	const spacing = $derived(read.choice('spacing', SPACING_KEYS, 'ample'));
	const aside = $derived(
		read.choice(
			'aside',
			['aucun', 'image', 'photos', 'liste', 'manuscrit', 'carte', 'carnet'] as const,
			'aucun'
		)
	);
	const asideSide = $derived(read.choice('asideSide', ['droite', 'gauche'] as const, 'droite'));
	const itemsLayout = $derived(
		read.choice('itemsLayout', ['colonnes', 'bord-a-bord'] as const, 'colonnes')
	);

	const title = $derived(read.text('title'));
	const intro = $derived(read.text('intro'));
	const figures = $derived(read.list('figures'));
	const items = $derived(read.list('items'));
	const image = $derived(read.image('image'));
	const note = $derived(read.text('asideNote'));
	const deckHref = $derived(read.raw('asideLink'));

	/**
	 * La colonne des photos se dimensionne sur son contenu, celle d'une liste ou
	 * d'une carte partage la largeur a egalite. C'est ce qui donne a l'eventail
	 * la hauteur de toute la section, au lieu du seul bas de la colonne.
	 */
	const HALVES = 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]';

	const columns = $derived.by(() => {
		if (aside !== 'photos' && aside !== 'image') return HALVES;
		return asideSide === 'gauche'
			? 'lg:grid-cols-[auto_minmax(0,1fr)]'
			: 'lg:grid-cols-[minmax(0,1fr)_auto]';
	});
</script>

{#snippet main()}
	<div class="flex flex-col">
		{#if title}
			<h2 {id}>
				<Marked
					text={title}
					highlight={read.text('highlight')}
					style={read.raw('highlightStyle') ?? 'brand'}
				/>
			</h2>
		{/if}

		{#if intro}
			<p class="measure mt-6 text-lg leading-relaxed">{intro}</p>
		{/if}

		{#if figures.length > 0}
			<!--
				Deux colonnes de chiffres et non quatre : la grille vit dans une
				demi-largeur, quatre y casseraient chaque libelle. UNE SEULE sous `sm`,
				parce que Bowlby One est tres large et ne coupe pas ses mots.
			-->
			<dl class="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2">
				{#each figures as figure, index (index)}
					<div class="flex flex-col-reverse gap-2">
						<dt class="text-base leading-snug">{read.itemText(figure, 'label')}</dt>
						<dd class="font-display text-4xl leading-none whitespace-nowrap">
							{read.itemText(figure, 'value')}
						</dd>
					</div>
				{/each}
			</dl>
		{/if}

		<div class="mt-6 text-lg">
			<RichText doc={read.doc('body')} {surface} />
		</div>

		<Buttons items={read.list('buttons')} {surface} />
	</div>
{/snippet}

{#snippet column()}
	{#if aside === 'photos'}
		<!--
			MOTION : le bloc entre une fois, quand il atteint la zone de lecture.
			L'ouverture de l'eventail, elle, repond au survol et au focus clavier.

			Un seul lien porte l'eventail entier : les cliches sont un seul objet, et
			trois liens empiles donneraient trois arrets de tabulation pour une seule
			destination. Les images sont donc `alt=""`, leur contenu etant deja porte
			par l'intitule du lien.
		-->
		<div class="h-full" use:reveal>
			<a
				href={deckHref ?? '/galerie'}
				class="photo-deck-link rounded-block focus-visible:outline-ink flex h-full focus-visible:outline-2 focus-visible:outline-offset-8"
			>
				<span class="photo-deck">
					{#each DECK_PHOTOS as photo (photo.src)}
						<img
							src={photo.src}
							alt=""
							width={photo.width}
							height={photo.height}
							loading="lazy"
							decoding="async"
							class="photo-deck-card photo-block"
						/>
					{/each}

					<span
						class="photo-deck-label glass-chip rounded-pill text-ink inline-flex min-h-11 items-center px-5 py-2.5 text-sm font-semibold"
					>
						Voir la galerie : {TOUR_PHOTOS.length} photos
					</span>
				</span>
			</a>
		</div>
	{:else if aside === 'image' && image}
		<div class="photo-block" use:reveal>
			<img
				src={image.src}
				alt={image.alt}
				width={image.width}
				height={image.height}
				loading="lazy"
				decoding="async"
				class="h-auto w-full"
			/>
		</div>
	{:else if aside === 'manuscrit' && note}
		<p class="font-hand self-center -rotate-2 text-3xl leading-tight sm:text-4xl">
			{#each note.split('\n') as line, index (index)}
				{#if index > 0}<br />{/if}{line}
			{/each}
		</p>
	{:else if aside === 'liste'}
		<div>
			{#if read.text('itemsTitle')}
				<!-- Le titre de la liste est lu, pas vu : la colonne de gauche porte
				     deja le titre visible de la section. -->
				<h2 class="sr-only">{read.text('itemsTitle')}</h2>
			{/if}

			<dl class="flex flex-col divide-y {divideClass(surface)}">
				{#each items as item, index (index)}
					{#if itemsLayout === 'bord-a-bord'}
						<div class="flex justify-between gap-4 py-3">
							<dt>{read.itemText(item, 'term')}</dt>
							<dd class="tabular font-semibold">{read.itemText(item, 'value')}</dd>
						</div>
					{:else}
						<div class="grid gap-1 py-4 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-6">
							<dt class="font-semibold {mutedClass(surface)}">{read.itemText(item, 'term')}</dt>
							<dd class="leading-snug">{read.itemText(item, 'value')}</dd>
						</div>
					{/if}
				{/each}
			</dl>

			<div class="mt-6 leading-relaxed {mutedClass(surface)}">
				<RichText doc={read.doc('itemsNote')} {surface} />
			</div>
		</div>
	{:else if aside === 'carte'}
		<!-- MOTION : la carte entre une fois quand elle atteint la zone de lecture. -->
		<div use:reveal><TourMap /></div>
	{:else if aside === 'carnet'}
		<PolarstepsEmbed />
	{/if}
{/snippet}

<Section {surface} {spacing} labelledby={title ? id : undefined}>
	{#if aside === 'aucun'}
		{@render main()}
	{:else}
		<div class="grid gap-10 {columns} lg:gap-16">
			{#if asideSide === 'gauche'}
				<!-- L'ordre du DOM suit l'ordre visuel : sur un ecran etroit les deux
				     colonnes s'empilent, et une colonne annoncee a gauche doit se lire
				     en premier, au clavier comme a l'oeil. -->
				{@render column()}
				{@render main()}
			{:else}
				{@render main()}
				{@render column()}
			{/if}
		</div>
	{/if}
</Section>
