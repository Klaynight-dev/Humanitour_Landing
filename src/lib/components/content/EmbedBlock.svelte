<script lang="ts">
	import PolarstepsEmbed from '$components/PolarstepsEmbed.svelte';
	import TourMap from '$components/TourMap.svelte';
	import { reveal } from '$lib/actions/reveal';
	import { SPACING_KEYS, SURFACE_KEYS } from '$lib/shared/content/blocks/common';
	import { getContentContext } from './context';
	import { sectionReader } from './read';
	import Section from './Section.svelte';
	import { mutedClass } from './surfaces';

	interface Props {
		id: string;
		data: Readonly<Record<string, unknown>>;
	}

	let { id, data }: Props = $props();

	const page = getContentContext();
	const read = $derived(sectionReader(data, page.tokens));

	const surface = $derived(read.choice('surface', SURFACE_KEYS, 'paper'));
	const spacing = $derived(read.choice('spacing', SPACING_KEYS, 'ample'));
	const content = $derived(read.choice('content', ['carte', 'carnet', 'image'] as const, 'carte'));
	const second = $derived(
		read.choice('secondContent', ['aucune', 'carte', 'carnet'] as const, 'aucune')
	);

	const title = $derived(read.text('title'));
	const intro = $derived(read.text('intro'));
	const subtitle = $derived(read.text('subtitle'));
	const image = $derived(read.image('image'));
</script>

{#snippet piece(kind: string)}
	{#if kind === 'carte'}
		<!-- MOTION : la carte entre une fois quand elle atteint la zone de lecture. -->
		<div class="mt-10" use:reveal><TourMap /></div>
	{:else if kind === 'carnet'}
		<div class="mt-10"><PolarstepsEmbed /></div>
	{:else if kind === 'image' && image}
		<div class="photo-block mt-10" use:reveal>
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
	{/if}
{/snippet}

<Section {surface} {spacing} labelledby={title ? id : undefined}>
	{#if title}<h2 {id} class="max-w-3xl" data-field="title">{title}</h2>{/if}
	{#if intro}
		<p class="measure mt-6 text-lg leading-relaxed {mutedClass(surface)}" data-field="intro">{intro}</p>
	{/if}

	{@render piece(content)}

	{#if second !== 'aucune'}
		<!--
			`scroll-mt-24` : l'en-tete est collante, et sans marge de defilement elle
			recouvrirait ce titre quand on y arrive par le lien de la carte.

			L'identifiant `carnet` est celui que vise ce lien : le renommer couperait
			le renvoi sans que rien ne le signale.
		-->
		<h3 id="carnet" class="mt-20 max-w-3xl scroll-mt-24 text-2xl sm:mt-24 sm:text-3xl">
			{subtitle}
		</h3>
		{@render piece(second)}
	{/if}
</Section>
