<script lang="ts">
	import PhotoLightbox from '$components/PhotoLightbox.svelte';
	import { reveal } from '$lib/actions/reveal';
	import { settled } from '$lib/actions/settled';
	import { SPACING_KEYS, SURFACE_KEYS } from '$lib/shared/content/blocks/common';
	import { TOUR_PHOTOS, type TourPhoto } from '$lib/shared/photos';
	import { SvelteSet } from 'svelte/reactivity';
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
	const spacing = $derived(read.choice('spacing', SPACING_KEYS, 'normal'));

	const title = $derived(read.text('title'));
	const intro = $derived(read.text('intro'));

	const photos = $derived.by(() => {
		const limit = read.number('limit');
		return limit === null || limit <= 0 ? TOUR_PHOTOS : TOUR_PHOTOS.slice(0, limit);
	});

	/**
	 * Les cliches dont l'image est arrivee, et qui n'ont donc plus de squelette.
	 *
	 * L'etat de depart est le squelette pour TOUS : c'est le seul que le serveur
	 * puisse rendre, ne sachant pas ce que le visiteur a deja en cache.
	 *
	 * `SvelteSet` et non `Set` : un `Set` ordinaire ne previent pas Svelte quand
	 * il change, il faudrait le recopier entier a chaque image arrivee.
	 */
	const arrived = new SvelteSet<string>();

	let openPhoto: TourPhoto | null = $state(null);
</script>

<Section {surface} {spacing} labelledby={title ? id : undefined} label={title ? undefined : 'Galerie'}>
	{#if title}<h2 {id} class="text-2xl sm:text-3xl" data-field="title">{title}</h2>{/if}
	{#if intro}
		<p class="measure mt-4 text-lg leading-relaxed {mutedClass(surface)}" data-field="intro">{intro}</p>
	{/if}

	<!--
		MOTION : les photos entrent l'une apres l'autre, une seule fois. Le decalage
		est plafonne a la premiere rangee : au-dela, une grille de vingt-six cliches
		ferait attendre le dernier trois secondes apres le premier.

		`aspect-4/5` et `object-cover` : les cliches sont en portrait ET en paysage,
		et une grille dont chaque case a sa propre hauteur devient un escalier. Le
		cadrage est donc commun, et c'est la seule vignette du site qui rogne — le
		fichier entier reste accessible en l'ouvrant en grand.
	-->
	<ul class="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3" class:mt-12={title || intro}>
		{#each photos as photo, index (photo.src)}
			<li use:reveal={(index % 3) * 110}>
				<button
					type="button"
					onclick={() => (openPhoto = photo)}
					aria-label="Agrandir la photo : {photo.alt}"
					class="focus-visible:outline-ink block w-full cursor-zoom-in text-left focus-visible:outline-2 focus-visible:outline-offset-4"
				>
					<img
						src={photo.src}
						alt={photo.alt}
						width={photo.width}
						height={photo.height}
						loading="lazy"
						decoding="async"
						use:settled={() => arrived.add(photo.src)}
						class="photo-block aspect-4/5 w-full object-cover {arrived.has(photo.src)
							? ''
							: 'photo-skeleton'}"
					/>
				</button>
			</li>
		{/each}
	</ul>

	<PhotoLightbox photo={openPhoto} onClose={() => (openPhoto = null)} />
</Section>
