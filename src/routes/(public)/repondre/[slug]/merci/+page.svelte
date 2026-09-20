<script lang="ts">
	import Button from '$components/Button.svelte';
	import { page } from '$app/state';

	const slug = $derived(page.params.slug);
</script>

<svelte:head>
	<title>Merci, Humanitour</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<!--
	Page distincte et non message en place : la redirection apres envoi empeche
	qu'un rafraichissement renvoie la reponse une seconde fois.
-->
<div class="bg-cream">
	<div class="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28">
		<h1 class="enter text-4xl sm:text-5xl">Merci. <span class="mark-brand">C'est compté.</span></h1>

		<p class="measure enter mx-auto mt-6 text-lg leading-relaxed" style="--enter-delay: 90ms">
			Votre réponse rejoint les données brutes de l'enquête. Elle y sera comptée comme toutes les
			autres, non-réponses comprises, sans pondération ni redressement. Elle apparaîtra dans les
			résultats publiés après la prochaine synchronisation.
		</p>

		<div class="mt-10 flex flex-wrap justify-center gap-3">
			<Button href="/donnees/{slug}" variant="primary">Voir les résultats</Button>
			<Button href="/repondre" variant="outline">Autres enquêtes ouvertes</Button>
		</div>
	</div>
</div>
