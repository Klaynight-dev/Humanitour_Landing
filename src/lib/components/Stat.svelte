<script lang="ts">
	interface Props {
		/** La valeur mise en avant. Toujours un comptage reel, jamais une estimation. */
		value: string;
		label: string;
		/** Precision de lecture : effectif de base, periode, source. */
		hint?: string;
	}

	let { value, label, hint }: Props = $props();
</script>

<div class="flex flex-col gap-1">
	<span class="tabular text-4xl leading-none font-bold tracking-tighter sm:text-5xl">
		{value}
	</span>
	<span class="font-display text-sm font-bold tracking-wide uppercase">{label}</span>
	{#if hint}
		<span class="text-muted text-xs">{hint}</span>
	{/if}
</div>
