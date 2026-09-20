<script lang="ts">
	import ContentBlocks from '$components/ContentBlocks.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Méthodologie, Humanitour</title>
	<meta
		name="description"
		content="Comment Humanitour collecte, calcule et publie. Aucun redressement, non-réponses comptées, données brutes ouvertes."
	/>
</svelte:head>

<!--
	Le seuil d'effectif publiable n'est pas ecrit dans le contenu : les textes en
	citent le jeton, et le rendu y met la valeur lue en base. Le site ne peut donc
	pas annoncer un seuil qu'il n'applique pas.
-->
<ContentBlocks blocks={data.blocks} tokens={data.tokens} team={data.team} />
