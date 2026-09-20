<script lang="ts">
	import ContentBlocks from '$components/ContentBlocks.svelte';
	import { SITE, TOUR } from '$lib/shared/site';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Galerie, {SITE.name}</title>
	<meta
		name="description"
		content="Les photographies des deux mois de terrain : les rencontres, les marchés, les haltes et les hébergements des {TOUR.kilometres} kilomètres du tour."
	/>
</svelte:head>

<ContentBlocks blocks={data.blocks} tokens={data.tokens} team={data.team} />
