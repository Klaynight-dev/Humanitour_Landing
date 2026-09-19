<script lang="ts">
	import type { CrosstabResult } from '$lib/server/survey/aggregate';
	import { formatCount, formatShare, SUPPRESSED_SYMBOL } from '$lib/shared/format';

	interface Props {
		data: CrosstabResult;
		xLabel: string;
		yLabel: string;
	}

	let { data, xLabel, yLabel }: Props = $props();
</script>

<!--
	Le tableau deborde horizontalement sur mobile plutot que de comprimer les
	colonnes jusqu'a l'illisible.

	La regle svelte que l'on desactive vise les elements rendus focalisables sans
	raison. Ici la raison est WCAG 2.1.1 : une zone qui defile et qu'on ne peut pas
	atteindre au clavier cache ses colonnes de droite a qui n'a pas de souris. Le
	couple role="region" + tabindex="0" est la technique recommandee pour ce cas.
-->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class="overflow-x-auto" tabindex="0" role="region" aria-label="Tableau croisé, défilement horizontal">
	<table class="w-full min-w-[36rem] border-collapse text-sm">
		<caption class="text-muted pb-3 text-left text-sm">
			{xLabel} croisé avec {yLabel}. Chaque case indique la part en ligne et son effectif.
		</caption>
		<thead>
			<tr class="border-ink border-b">
				<th scope="col" class="py-2 pr-4 text-left font-semibold">{xLabel}</th>
				{#each data.yModalities as modality (modality.key)}
					<th scope="col" class="px-3 py-2 text-right font-semibold whitespace-nowrap">
						{modality.label}
					</th>
				{/each}
				<th scope="col" class="py-2 pl-3 text-right font-semibold">Total</th>
			</tr>
		</thead>
		<tbody>
			{#each data.xModalities as xModality (xModality.key)}
				<tr class="border-ink border-b last:border-0">
					<th scope="row" class="py-2.5 pr-4 text-left font-medium">{xModality.label}</th>
					{#each data.yModalities as yModality (yModality.key)}
						{@const cell = data.cells.get(xModality.key)?.get(yModality.key)}
						<td class="tabular px-3 py-2.5 text-right">
							{#if !cell || cell.suppressed}
								<span class="text-muted" title="Effectif insuffisant pour publier ce croisement">
									{SUPPRESSED_SYMBOL}
								</span>
							{:else}
								<span class="font-semibold">{formatShare(cell.share)}</span>
								<span class="text-muted ml-1 text-xs">({formatCount(cell.count)})</span>
							{/if}
						</td>
					{/each}
					<td class="tabular text-muted py-2.5 pl-3 text-right">
						{formatCount(data.rowTotals.get(xModality.key) ?? null)}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
