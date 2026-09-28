<script lang="ts">
	import type { TimelineResult } from '$lib/server/survey/timeline';
	import {
		formatCount,
		formatShare,
		formatWeek,
		SUPPRESSED_LABEL,
		SUPPRESSED_SYMBOL
	} from '$shared/format';

	/**
	 * Le tableau des chiffres qui accompagne la courbe d evolution.
	 *
	 * Comme `ResultTable`, c est la compensation exigee par la palette : la
	 * couleur ne porte jamais seule l information (`charts/palette.ts`).
	 *
	 * Il fait une chose de plus que la courbe : il montre TOUTES les modalites.
	 * La courbe replie au-dela de sept dans « Autres » pour rester lisible
	 * (`foldTimeline`) ; le tableau, lui, ne perd rien, et c est ici qu on vient
	 * lire la modalite repliee.
	 *
	 * Une ligne par modalite, une colonne par semaine. L inverse ferait autant
	 * de colonnes que de modalites, soit vingt-quatre pour le premier tour.
	 */
	interface Props {
		data: TimelineResult;
		/** Libelle exact de la question, qui sert de titre au tableau. */
		question: string;
	}

	let { data, question }: Props = $props();

	const semaines = $derived(data.periods.map((period) => formatWeek(period.start)));
</script>

<table class="w-full border-collapse text-sm">
	<caption class="text-muted pb-3 text-left">
		{question}, semaine par semaine. Le tiret signale une case masquée par le seuil d'anonymat.
	</caption>
	<thead>
		<tr class="border-ink/20 border-b">
			<th scope="col" class="py-2 pr-3 text-left font-semibold">Modalité</th>
			{#each data.periods as period, index (period.key)}
				<th scope="col" class="py-2 pr-3 text-right font-semibold whitespace-nowrap">
					{semaines[index]}
				</th>
			{/each}
		</tr>
	</thead>
	<tbody>
		<!-- La base d abord : une part ne se lit pas sans l effectif dont elle est
		     tiree (`formatBase`), et il change d une semaine a l autre. -->
		<tr class="border-ink/20 border-b">
			<th scope="row" class="text-muted py-2 pr-3 text-left font-normal">Répondants</th>
			{#each data.periods as period (period.key)}
				<td class="tabular text-muted py-2 pr-3 text-right">
					{#if period.respondents === null}
						<span aria-hidden="true">{SUPPRESSED_SYMBOL}</span>
						<span class="sr-only">{SUPPRESSED_LABEL}</span>
					{:else}
						{formatCount(period.respondents)}
					{/if}
				</td>
			{/each}
		</tr>

		{#each data.series as series (series.key)}
			<tr class="border-ink/12 border-b last:border-0">
				<th
					scope="row"
					class="py-2 pr-3 text-left font-normal {series.isNonResponse ? 'text-muted italic' : ''}"
				>
					{series.label}
				</th>
				{#each series.shares as share, index (data.periods[index]?.key ?? index)}
					<td class="tabular py-2 pr-3 text-right">
						{#if share === null}
							<span aria-hidden="true">{SUPPRESSED_SYMBOL}</span>
							<span class="sr-only">{SUPPRESSED_LABEL}</span>
						{:else}
							{formatShare(share)}
						{/if}
					</td>
				{/each}
			</tr>
		{/each}
	</tbody>
</table>
