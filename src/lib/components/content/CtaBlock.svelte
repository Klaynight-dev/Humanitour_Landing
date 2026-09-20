<script lang="ts">
	import { SPACING_KEYS, SURFACE_KEYS } from '$lib/shared/content/blocks/common';
	import Buttons from './Buttons.svelte';
	import { getContentContext } from './context';
	import Marked from './Marked.svelte';
	import { sectionReader } from './read';
	import Section from './Section.svelte';

	interface Props {
		id: string;
		data: Readonly<Record<string, unknown>>;
	}

	let { id, data }: Props = $props();

	const page = getContentContext();
	const read = $derived(sectionReader(data, page.tokens));

	const surface = $derived(read.choice('surface', SURFACE_KEYS, 'brand'));
	const spacing = $derived(read.choice('spacing', SPACING_KEYS, 'ample'));
	const intro = $derived(read.text('intro'));
</script>

<!--
	La cloture d'une page. Sur le degrade de marque, le texte est noir et jamais
	blanc : blanc sur l'orange de la charte ne donne que 2,69:1. La couleur de
	texte vient de la surface elle-meme (`app.css`), il n'y a rien a regler ici.
-->
<Section {surface} {spacing} labelledby={id}>
	<h2 {id} class="max-w-4xl text-3xl sm:text-5xl" data-field="title">
		<Marked
			text={read.text('title') ?? ''}
			highlight={read.text('highlight')}
			style={read.raw('highlightStyle') ?? 'brand'}
		/>
	</h2>

	{#if intro}
		<p class="measure mt-7 text-xl font-medium" data-field="intro">{intro}</p>
	{/if}

	<Buttons items={read.list('buttons')} {surface} class="mt-10" />
</Section>
