<script lang="ts">
	import type { DistributionResult } from '$lib/server/survey/aggregate';
	import { formatCount, formatShare, SUPPRESSED_LABEL } from '$lib/shared/format';
	import { colorFor, SUPPRESSED_COLOR } from './palette';

	interface Props {
		data: DistributionResult;
		/** Libelle exact de la question, affiche avec le graphique. */
		question: string;
	}

	let { data, question }: Props = $props();

	// L echelle se cale sur la plus grande part publiee, pas sur 100 % : sinon une
	// distribution ou tout est sous 20 % devient une rangee de traits illisibles.
	const maxShare = $derived(
		Math.max(0.01, ...data.bars.map((bar) => bar.share ?? 0))
	);
</script>

<figure class="flex flex-col gap-4">
	<figcaption class="text-ink-soft text-sm">{question}</figcaption>

	<ul class="flex flex-col gap-3">
		{#each data.bars as bar, index (bar.key)}
			{@const width = bar.share === null ? 100 : (bar.share / maxShare) * 100}
			<li class="flex flex-col gap-1.5">
				<div class="flex items-baseline justify-between gap-4">
					<!-- Libelle et chiffre en toutes lettres : la couleur ne porte jamais
					     seule l information, ce qu'impose le contraste de la palette. -->
					<span class="text-sm font-medium">{bar.label}</span>
					<span class="tabular text-muted shrink-0 text-sm">
						{#if bar.suppressed}
							{SUPPRESSED_LABEL}
						{:else}
							<span class="text-ink font-semibold">{formatShare(bar.share)}</span>
							<span class="ml-1.5">({formatCount(bar.count)})</span>
						{/if}
					</span>
				</div>

				<div class="bg-surface h-2.5 overflow-hidden rounded-full">
					<div
						class="h-full rounded-full"
						style:width="{width}%"
						style:background-color={bar.suppressed
							? SUPPRESSED_COLOR
							: colorFor(index, { isNonResponse: bar.isNonResponse, override: bar.color })}
						style:background-image={bar.suppressed
							? 'repeating-linear-gradient(45deg, transparent 0 4px, rgba(0,0,0,.08) 4px 8px)'
							: undefined}
					></div>
				</div>
			</li>
		{/each}
	</ul>
</figure>
