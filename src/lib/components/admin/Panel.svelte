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

<!--
	Surface du back-office : `panel` et non `block-card`. Un ecran d administration
	aligne des tableaux denses, l oeil a besoin d un trait pour voir ou le
	conteneur s arrete. Le site public, lui, separe par le fond seul.
-->
<section class="panel overflow-hidden">
	{#if title}
		<header class="border-ink/12 border-b px-5 py-4">
			<h2 class="text-base font-semibold">{title}</h2>
			{#if description}<p class="text-muted mt-1 text-sm">{description}</p>{/if}
		</header>
	{/if}
	<div class="p-5">{@render children()}</div>
	{#if footer}
		<footer class="border-ink/12 bg-cream border-t px-5 py-3">{@render footer()}</footer>
	{/if}
</section>
