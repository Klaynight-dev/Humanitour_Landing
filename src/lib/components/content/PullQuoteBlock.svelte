<script lang="ts">
	import RichText from '$components/RichText.svelte';
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

	const surface = $derived(read.choice('surface', SURFACE_KEYS, 'cream'));
	const spacing = $derived(read.choice('spacing', SPACING_KEYS, 'ample'));

	const title = $derived(read.text('title'));
	const subtitle = $derived(read.text('subtitle'));
	const sourceUrl = $derived(read.raw('sourceUrl'));
	const items = $derived(read.list('items'));
</script>

<!--
	Composition asymetrique : l'attribution tient dans une colonne etroite a
	gauche, la citation et ce qu'elle entraine occupent la largeur utile.
-->
<Section {surface} {spacing} labelledby={title ? id : undefined}>
	<div class="grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
		<div>
			{#if title}<h2 {id} class="text-2xl sm:text-3xl">{title}</h2>{/if}
			{#if subtitle}
				<p class="mt-3 text-base {mutedClass(surface)}">{subtitle}</p>
			{/if}
		</div>

		<div>
			<blockquote class="measure text-2xl leading-snug font-medium sm:text-3xl">
				« {read.text('quote')} »
			</blockquote>

			<!-- Une citation sans source ne se publie pas : l'auteur est obligatoire
			     a la saisie, il ne peut donc pas manquer ici. -->
			<p class="mt-4 text-base {mutedClass(surface)}">
				{read.text('author')}
				{#if sourceUrl}
					—
					<a href={sourceUrl} class="underline decoration-2 underline-offset-2">la source</a>
				{/if}
			</p>

			<div class="mt-12 text-lg">
				<RichText doc={read.doc('body')} />
			</div>

			{#if items.length > 0}
				<dl class="mt-10 flex flex-col gap-8">
					{#each items as item, index (index)}
						<div class="measure">
							<dt class="text-xl font-semibold">{read.itemText(item, 'term')}</dt>
							<dd class="mt-2 leading-relaxed {mutedClass(surface)}">
								{read.itemText(item, 'body')}
							</dd>
						</div>
					{/each}
				</dl>
			{/if}
		</div>
	</div>
</Section>
