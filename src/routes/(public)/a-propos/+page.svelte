<script lang="ts">
	import ContentBlocks from '$components/ContentBlocks.svelte';
	import { SITE } from '$lib/shared/site';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>L'institut, {SITE.name}</title>
	<meta
		name="description"
		content="Humanitour, premier institut de sondage citoyen et indépendant : sa vision, ses valeurs, son équipe et son histoire."
	/>
	<meta property="og:title" content="L'institut, {SITE.name}" />
	<meta property="og:type" content="website" />
</svelte:head>

<ContentBlocks blocks={data.blocks} tokens={data.tokens} team={data.team} />
