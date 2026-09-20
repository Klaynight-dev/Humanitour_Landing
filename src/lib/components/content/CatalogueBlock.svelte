<script lang="ts">
	import RichText from '$components/RichText.svelte';
	import { SPACING_KEYS, SURFACE_KEYS } from '$lib/shared/content/blocks/common';
	import Buttons from './Buttons.svelte';
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

	const surface = $derived(read.choice('surface', SURFACE_KEYS, 'cream'));
	const spacing = $derived(read.choice('spacing', SPACING_KEYS, 'normal'));

	const catalogue = $derived(page.catalogue);
</script>

<!--
	Le catalogue d'une page : enquetes, mediatheque, formulaires ouverts.

	La liste, sa recherche et ses filtres restent rendus par la page — leurs
	adresses sont un contrat public, et une saisie de back-office ne doit pas
	pouvoir les vider. Cette section n'en habille que le pourtour, et surtout
	elle porte le texte affiche quand il n'y a rien a montrer : c'est le moment
	ou une page a le plus besoin d'etre ecrite.
-->
<Section {surface} {spacing} label="Catalogue">
	{@render catalogue?.controls?.()}

	{#if catalogue === undefined}
		<!-- La page n'a pas fourni de liste : plutot qu'un vide inexplicable, on
		     dit ce qui manque. Ne se voit qu'en cas d'erreur de montage. -->
		<p class="text-muted text-sm">Cette page n’affiche aucun catalogue.</p>
	{:else if catalogue.empty}
		<div class="bg-paper rounded-block mt-8 p-8 sm:p-12">
			<h2 {id} class="text-2xl">{read.text('emptyTitle')}</h2>
			<p class="measure mt-4 leading-relaxed">{read.text('emptyBody')}</p>
			<Buttons items={read.list('buttons')} surface="paper" size="md" class="mt-7" />
		</div>
	{:else}
		{@render catalogue.body()}
	{/if}

	<div class="measure mt-10 text-sm {mutedClass(surface)}" data-field="note" data-field-kind="doc">
		<RichText doc={read.doc('note')} {surface} />
	</div>
</Section>
