<script lang="ts">
	import ContentBlocks from '$components/ContentBlocks.svelte';
	import { SITE } from '$lib/shared/site';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>À propos, {SITE.name}</title>
	<meta
		name="description"
		content="Les cinq personnes derrière Humanitour, l'association qui les porte, et ce qui la finance."
	/>
	<meta property="og:title" content="À propos, {SITE.name}" />
	<meta property="og:type" content="website" />
</svelte:head>

<ContentBlocks blocks={data.blocks} tokens={data.tokens} team={data.team} />
