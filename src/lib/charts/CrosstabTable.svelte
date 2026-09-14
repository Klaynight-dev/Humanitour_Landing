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

<!-- Le tableau deborde horizontalement sur mobile plutot que de comprimer les
     colonnes jusqu'a l'illisible. -->
<div class="overflow-x-auto">
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
