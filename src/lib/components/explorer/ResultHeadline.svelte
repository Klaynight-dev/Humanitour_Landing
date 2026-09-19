<script lang="ts">
	import type { Insight } from '$lib/server/survey/insights';
	import { formatCount, formatShare } from '$shared/format';

	/**
	 * Le constat principal, ecrit avant le graphique.
	 *
	 * Deux regles, et elles viennent de ce que ce bloc pourrait devenir s il
	 * n etait pas tenu :
	 *
	 *   1. Les chiffres sont CALCULES (`insights.ts`), jamais choisis a la main
	 *      ni arrondis pour faire un meilleur titre.
	 *   2. Les phrases sont ECRITES ici, une fois, et seules les valeurs y
	 *      entrent. On enonce un comptage, jamais ce qu il faudrait en penser :
	 *      « le pouvoir d achat arrive en tete » est un fait, « les Francais
	 *      sont inquiets » serait un commentaire, et ce n est pas notre role
	 *      (AGENTS.md section 0).
	 */
	interface Props {
		insights: readonly Insight[];
	}

	let { insights }: Props = $props();

	const headline = $derived(insights[0] ?? null);
	const rest = $derived(insights.slice(1));
</script>

{#if headline}
	<div class="border-ink/12 border-b pb-6">
		{#if headline.kind === 'dominant'}
			<p class="tabular text-5xl leading-none font-bold sm:text-6xl">
				{formatShare(headline.share)}
			</p>
			<p class="measure mt-3 text-lg leading-snug">
				<span class="font-semibold">{headline.label}</span>
				arrive en tête, sur
				<span class="tabular">{formatCount(headline.count)}</span> répondants.
			</p>
		{:else if headline.kind === 'gap'}
			<p class="tabular text-5xl leading-none font-bold sm:text-6xl">
				{headline.points} pts
			</p>
			<p class="measure mt-3 text-lg leading-snug">
				d'écart sur <span class="font-semibold">{headline.yLabel}</span>
				entre {headline.highLabel} ({formatShare(headline.highShare)}) et
				{headline.lowLabel} ({formatShare(headline.lowShare)}).
			</p>
		{:else}
			<p class="tabular text-5xl leading-none font-bold sm:text-6xl">
				{formatShare(headline.share)}
			</p>
			<p class="measure mt-3 text-lg leading-snug">
				n'ont pas répondu à cette question, soit
				<span class="tabular">{formatCount(headline.count)}</span> personnes.
			</p>
		{/if}

		{#if rest.length > 0}
			<ul class="measure text-ink-soft mt-4 flex flex-col gap-1.5 text-sm leading-relaxed">
				{#each rest as insight (insight.kind)}
					<li>
						{#if insight.kind === 'dominant'}
							{insight.label} arrive en tête avec {formatShare(
								insight.share
							)}{#if insight.runnerUpLabel}, soit
								{insight.leadPoints} points devant {insight.runnerUpLabel}{/if}.
						{:else if insight.kind === 'non-response'}
							{formatShare(insight.share)} des répondants n'ont pas répondu à cette question, soit
							{formatCount(insight.count)} personnes. Elles sont comptées, pas écartées.
						{:else}
							{insight.yLabel} va de {formatShare(insight.lowShare)} ({insight.lowLabel}) à
							{formatShare(insight.highShare)} ({insight.highLabel}).
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}
