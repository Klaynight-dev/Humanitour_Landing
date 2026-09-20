<script lang="ts">
	import ContentBlocks from '$components/ContentBlocks.svelte';
	import { SITE, TOUR } from '$lib/shared/site';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Le tour, {SITE.name}</title>
	<meta
		name="description"
		content="{TOUR.kilometres} kilomètres à vélo en {TOUR.months} mois, à travers les {TOUR.regions} régions métropolitaines : comment Humanitour est allé rencontrer {TOUR.respondents} personnes plutôt que de les sonder par courriel."
	/>
</svelte:head>

<ContentBlocks blocks={data.blocks} tokens={data.tokens} team={data.team} />
