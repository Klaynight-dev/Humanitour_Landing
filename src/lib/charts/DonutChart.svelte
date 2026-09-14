<script lang="ts">
	import type { DistributionResult } from '$lib/server/survey/aggregate';
	import { formatCount, formatShare, SUPPRESSED_LABEL } from '$lib/shared/format';
	import { colorFor, SUPPRESSED_COLOR } from './palette';

	interface Props {
		data: DistributionResult;
		question: string;
	}

	let { data, question }: Props = $props();

	const RADIUS = 60;
	const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
	/** 2px de surface entre deux parts, pour qu elles ne se lisent pas comme une. */
	const GAP = 2;

	interface Segment {
		readonly key: string;
		readonly label: string;
		readonly color: string;
		readonly length: number;
		readonly offset: number;
	}

	const segments = $derived.by(() => {
		const result: Segment[] = [];
		let cursor = 0;

		data.bars.forEach((bar, index) => {
			const share = bar.share ?? 0;
			if (share <= 0) return;

			const length = Math.max(0, share * CIRCUMFERENCE - GAP);
			result.push({
				key: bar.key,
				label: bar.label,
				color: bar.suppressed
					? SUPPRESSED_COLOR
					: colorFor(index, { isNonResponse: bar.isNonResponse, override: bar.color }),
				length,
				offset: -cursor
			});

			cursor += share * CIRCUMFERENCE;
		});

		return result;
	});
</script>

<figure class="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
	<svg viewBox="0 0 160 160" class="h-40 w-40 shrink-0" role="img" aria-label={question}>
		<g transform="rotate(-90 80 80)">
			{#each segments as segment (segment.key)}
				<circle
					cx="80"
					cy="80"
					r={RADIUS}
					fill="none"
					stroke={segment.color}
					stroke-width="20"
					stroke-dasharray="{segment.length} {CIRCUMFERENCE - segment.length}"
					stroke-dashoffset={segment.offset}
				/>
			{/each}
		</g>
		<text
			x="80"
			y="76"
			text-anchor="middle"
			class="fill-ink font-display text-[20px] font-semibold"
			style="font-variant-numeric: tabular-nums"
		>
			{formatCount(data.respondents)}
		</text>
		<text x="80" y="92" text-anchor="middle" class="fill-current text-[10px] opacity-60">
			répondants
		</text>
	</svg>

	<!-- La legende porte le libelle ET le chiffre : l anneau seul ne se lit pas. -->
	<ul class="flex w-full flex-col gap-2">
		{#each data.bars as bar, index (bar.key)}
			<li class="flex items-baseline gap-2 text-sm">
				<span
					class="mt-1.5 h-3 w-3 shrink-0 rounded-sm"
					style:background-color={bar.suppressed
						? SUPPRESSED_COLOR
						: colorFor(index, { isNonResponse: bar.isNonResponse, override: bar.color })}
					aria-hidden="true"
				></span>
				<span class="flex-1">{bar.label}</span>
				<span class="tabular shrink-0">
					{#if bar.suppressed}
						<span class="text-muted text-xs">{SUPPRESSED_LABEL}</span>
					{:else}
						<span class="font-semibold">{formatShare(bar.share)}</span>
						<span class="text-muted ml-1 text-xs">({formatCount(bar.count)})</span>
					{/if}
				</span>
			</li>
		{/each}
	</ul>
</figure>
