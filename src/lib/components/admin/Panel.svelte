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

<section class="brut bg-paper rounded-card">
	{#if title}
		<header class="border-ink border-b px-5 py-4">
			<h2 class="font-display font-semibold">{title}</h2>
			{#if description}<p class="text-muted mt-1 text-sm">{description}</p>{/if}
		</header>
	{/if}
	<div class="p-5">{@render children()}</div>
	{#if footer}
		<footer class="border-ink bg-surface border-t-2 px-5 py-3">{@render footer()}</footer>
	{/if}
</section>
