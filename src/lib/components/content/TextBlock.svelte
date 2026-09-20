<script lang="ts">
	import RichText from '$components/RichText.svelte';
	import { SPACING_KEYS, SURFACE_KEYS } from '$lib/shared/content/blocks/common';
	import Buttons from './Buttons.svelte';
	import { getContentContext } from './context';
	import Marked from './Marked.svelte';
	import { sectionReader } from './read';
	import Section from './Section.svelte';
	import { mutedClass, SURFACE_CLASS } from './surfaces';

	interface Props {
		id: string;
		data: Readonly<Record<string, unknown>>;
	}

	let { id, data }: Props = $props();

	const page = getContentContext();
	const read = $derived(sectionReader(data, page.tokens));

	const surface = $derived(read.choice('surface', SURFACE_KEYS, 'paper'));
	const spacing = $derived(read.choice('spacing', SPACING_KEYS, 'normal'));
	const layout = $derived(read.choice('layout', ['pleine', 'colonne', 'encadre'] as const, 'pleine'));

	const title = $derived(read.text('title'));
	const intro = $derived(read.text('intro'));
	const items = $derived(read.list('items'));
	const note = $derived(read.text('note'));

	/**
	 * L'encadre vit SUR une page, il n'est pas la page.
	 *
	 * Sa couleur est celle de la boite ; la section qui la porte garde le fond
	 * courant. Sans cette distinction, un encadre noir peindrait toute la bande
	 * en noir et l'effet d'encadre disparaitrait.
	 */
	const sectionSurface = $derived(layout === 'encadre' ? 'paper' : surface);
</script>

{#snippet heading()}
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
		<p class="measure mt-3 text-base leading-relaxed {mutedClass(surface)}">{intro}</p>
	{/if}
{/snippet}

{#snippet content()}
	<RichText doc={read.doc('body')} {surface} />

	{#if items.length > 0}
		<div class="mt-10 grid gap-8 sm:grid-cols-2">
			{#each items as item, index (index)}
				<div>
					<h3 class="text-lg font-semibold">{read.itemText(item, 'term')}</h3>
					<p class="mt-2 leading-relaxed {mutedClass(surface)}">{read.itemText(item, 'body')}</p>
				</div>
			{/each}
		</div>
	{/if}

	{#if note}
		<p class="measure mt-8 text-sm leading-relaxed {mutedClass(surface)}">{note}</p>
	{/if}

	<Buttons items={read.list('buttons')} {surface} />
{/snippet}

<Section surface={sectionSurface} {spacing} labelledby={title ? id : undefined}>
	{#if layout === 'colonne'}
		<!-- Titre en colonne etroite a gauche : le gabarit des questions de
		     l'accueil. Une page ne devrait l'employer qu'une fois. -->
		<div class="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-16">
			<div>{@render heading()}</div>
			<div>{@render content()}</div>
		</div>
	{:else if layout === 'encadre'}
		<div class="rounded-block p-8 sm:p-12 {SURFACE_CLASS[surface]}">
			{@render heading()}
			<div class="mt-6">{@render content()}</div>
		</div>
	{:else}
		{@render heading()}
		<div class="mt-6">{@render content()}</div>
	{/if}
</Section>
