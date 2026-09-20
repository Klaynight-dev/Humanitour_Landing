<script lang="ts">
	import { SPACING_KEYS, SURFACE_KEYS } from '$lib/shared/content/blocks/common';
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

	const surface = $derived(read.choice('surface', SURFACE_KEYS, 'ink'));
	const spacing = $derived(read.choice('spacing', SPACING_KEYS, 'normal'));

	const title = $derived(read.text('title'));
	const rows = $derived(read.list('rows'));
	const note = $derived(read.text('note'));

	const headBorder = $derived(surface === 'ink' ? 'border-paper/25' : 'border-ink/25');
	const rowBorder = $derived(surface === 'ink' ? 'border-paper/15' : 'border-ink/12');
</script>

<Section {surface} {spacing} labelledby={title ? id : undefined}>
	{#if title}
		<h2 {id} class="max-w-3xl">
			<Marked
				text={title}
				highlight={read.text('highlight')}
				style={read.raw('highlightStyle') ?? 'brand'}
			/>
		</h2>
	{/if}

	<table class="mt-10 w-full border-collapse text-left sm:mt-14">
		<!-- La legende n'est pas decorative : elle remplace le tableau entier
			     pour un lecteur d'ecran qui le survole. -->
		<caption class="sr-only">{read.text('caption')}</caption>
		<thead>
			<tr class="border-b {headBorder}">
				<th scope="col" class="pb-3 text-left text-sm font-semibold opacity-70">
					{read.text('column1')}
				</th>
				<th scope="col" class="px-3 pb-3 text-left text-sm font-semibold opacity-70">
					{read.text('column2')}
				</th>
				<th scope="col" class="pb-3 text-right text-sm font-semibold opacity-70">
					{read.text('column3')}
				</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row, index (index)}
				{@const detail = read.itemText(row, 'detail')}
				<tr class="border-b {rowBorder}">
					<th
						scope="row"
						class="py-4 text-left align-baseline text-base font-semibold sm:py-5 sm:text-lg"
					>
						{read.itemText(row, 'entry')}
						{#if detail}<span class="block text-sm font-normal opacity-60">{detail}</span>{/if}
					</th>
					<td class="px-3 py-4 align-baseline text-sm opacity-70 sm:py-5 sm:text-base">
						{read.itemText(row, 'value1')}
					</td>
					<td class="py-4 text-right align-baseline sm:py-5">
						<!--
								MOTION : un seul geste, joue une fois au chargement, les valeurs
								tombent ligne par ligne comme le soir d'un scrutin. Aucune boucle,
								aucun declenchement au defilement. L'etat de base est deja l'etat
								final : rien ne depend de l'animation pour etre lu.
							-->
						<span
							class="drop figure font-display block text-xl leading-none whitespace-nowrap sm:text-3xl lg:text-4xl"
							style="animation-delay: {index * 90 + 120}ms"
						>
							{read.itemText(row, 'value2')}
						</span>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	{#if note}
		<!-- Pleine largeur et non la mesure de lecture : la note commente un
		     tableau qui occupe toute la section, et s'arreter a mi-parcours la
		     detacherait de ce qu'elle explique. -->
		<p class="mt-6 text-base leading-relaxed opacity-80">{note}</p>
	{/if}
</Section>

<style>
	@keyframes drop-in {
		from {
			opacity: 0;
			transform: translateY(-0.4rem);
		}
	}

	.drop {
		animation: drop-in 420ms cubic-bezier(0.22, 0.61, 0.36, 1) backwards;
	}

	/*
	 * Les valeurs mises en avant, remplies du degrade de marque comme les titres
	 * des documents imprimes.
	 *
	 * L'utilitaire `text-gradient` d'`app.css` ne convient pas ici : sa reserve
	 * `@supports` retombe sur `--color-coral-ink`, un correctif pour fond clair,
	 * qui sur le noir ne donnerait que 3,3:1. Le corail de la charte y donne
	 * 6,75:1.
	 */
	.figure {
		background-image: var(--gradient-brand);
		background-clip: text;
		color: transparent;
	}

	@supports not (background-clip: text) {
		.figure {
			color: var(--color-coral);
		}
	}

	/*
	 * `animation: none` et non une duree nulle : la reinitialisation globale
	 * d'`app.css` ecrase la duree en `!important` mais pas le nom, et un delai
	 * subsisterait donc sur un element masque.
	 */
	@media (prefers-reduced-motion: reduce) {
		.drop {
			animation: none;
		}
	}
</style>
