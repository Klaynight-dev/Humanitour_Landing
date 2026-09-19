<script lang="ts">
	import NavigationProgress from '$components/NavigationProgress.svelte';
	import '../app.css';

	let { children } = $props();
</script>

<!--
	Layout racine : la feuille de styles, et le seul element commun a TOUTES les
	pages, la barre de progression des navigations.

	Elle est posee ici et non dans `(public)` : une navigation lente se produit
	aussi bien au back-office, et l attente y merite le meme retour.

	Le chrome public (en-tete, pied de page) vit dans `(public)/+layout.svelte`,
	le back-office a le sien. Sans cette separation, l administration s affichait
	entouree de la navigation marketing et du pied de page de l association.
	Les pages d authentification, elles, restent volontairement nues.
-->
<NavigationProgress />

{@render children()}
