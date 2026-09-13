<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		description?: string;
		action?: Snippet;
	}

	let { title, description, action }: Props = $props();
</script>

<div class="border-line bg-paper rounded-card border border-dashed p-10 text-center">
	<p class="font-display text-lg font-semibold">{title}</p>
	{#if description}
		<p class="text-muted mx-auto mt-2 max-w-md text-sm">{description}</p>
	{/if}
	{#if action}
		<div class="mt-6 flex justify-center gap-2">{@render action()}</div>
	{/if}
</div>
