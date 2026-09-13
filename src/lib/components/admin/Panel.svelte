<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		description?: string;
		children: Snippet;
		footer?: Snippet;
	}

	let { title, description, children, footer }: Props = $props();
</script>

<section class="border-line bg-paper rounded-card border">
	{#if title}
		<header class="border-line border-b px-5 py-4">
			<h2 class="font-display font-semibold">{title}</h2>
			{#if description}<p class="text-muted mt-1 text-sm">{description}</p>{/if}
		</header>
	{/if}
	<div class="p-5">{@render children()}</div>
	{#if footer}
		<footer class="border-line bg-surface border-t px-5 py-3">{@render footer()}</footer>
	{/if}
</section>
