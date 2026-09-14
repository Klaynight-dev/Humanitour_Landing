<script lang="ts">
	import type { CrosstabResult } from '$lib/server/survey/aggregate';
	import { formatCount, formatShare } from '$lib/shared/format';
	import { colorFor, SUPPRESSED_COLOR } from './palette';

	interface Props {
		data: CrosstabResult;
		xLabel: string;
		yLabel: string;
	}

	let { data, xLabel, yLabel }: Props = $props();
</script>

<figure class="flex flex-col gap-5">
	<figcaption class="text-ink-soft text-sm">
		{xLabel} croisé avec {yLabel}. Chaque barre vaut 100 % de sa ligne.
	</figcaption>

	<!-- Legende toujours presente des deux series : l identite ne repose jamais
	     sur la couleur seule. -->
	<ul class="flex flex-wrap gap-x-4 gap-y-2">
		{#each data.yModalities as modality, index (modality.key)}
			<li class="flex items-center gap-1.5 text-xs">
				<span
					class="h-3 w-3 shrink-0 rounded-sm"
					style:background-color={colorFor(index, {
						isNonResponse: modality.isNonResponse,
						override: modality.color
					})}
					aria-hidden="true"
				></span>
				<span>{modality.label}</span>
			</li>
		{/each}
	</ul>

	<ul class="flex flex-col gap-3">
		{#each data.xModalities as xModality (xModality.key)}
			{@const total = data.rowTotals.get(xModality.key)}
			<li class="flex flex-col gap-1.5">
				<div class="flex items-baseline justify-between gap-4">
					<span class="text-sm font-medium">{xModality.label}</span>
					<span class="tabular text-muted text-xs">{formatCount(total ?? null)} répondants</span>
				</div>

				<!-- 2px de fond entre les segments : sans cet ecart, deux teintes
				     voisines se lisent comme une seule zone. -->
				<div class="bg-surface flex h-6 gap-[2px] overflow-hidden rounded-md">
					{#each data.yModalities as yModality, index (yModality.key)}
						{@const cell = data.cells.get(xModality.key)?.get(yModality.key)}
						{#if cell && (cell.share ?? 0) > 0}
							<div
								class="flex items-center justify-center"
								style:width="{(cell.share ?? 0) * 100}%"
								style:background-color={cell.suppressed
									? SUPPRESSED_COLOR
									: colorFor(index, {
											isNonResponse: yModality.isNonResponse,
											override: yModality.color
										})}
								title="{xModality.label} / {yModality.label} : {formatShare(cell.share)}"
							>
								<!-- Etiquette directe seulement quand le segment est assez large :
								     jamais un nombre sur chaque segment. -->
								{#if (cell.share ?? 0) > 0.12 && !cell.suppressed}
									<span class="tabular px-1 text-[10px] font-semibold text-white">
										{formatShare(cell.share)}
									</span>
								{/if}
							</div>
						{/if}
					{/each}
				</div>
			</li>
		{/each}
	</ul>
</figure>
