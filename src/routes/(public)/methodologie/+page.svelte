<script lang="ts">
	import ContentBlocks from '$components/ContentBlocks.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Méthodologie, Humanitour</title>
	<meta
		name="description"
		content="Une approche scientifique et humaine du sondage : trois principes, des résultats contextualisés, une transparence intégrale et des données ouvertes."
	/>
</svelte:head>

<!--
	Le seuil d'effectif publiable n'est pas ecrit dans le contenu : les textes en
	citent le jeton, et le rendu y met la valeur lue en base. Le site ne peut donc
	pas annoncer un seuil qu'il n'applique pas.
-->
<ContentBlocks blocks={data.blocks} tokens={data.tokens} team={data.team} />
