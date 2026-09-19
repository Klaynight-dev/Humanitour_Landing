<script lang="ts">
	import Footer from '$components/Footer.svelte';
	import Header from '$components/Header.svelte';

	let { children } = $props();
</script>

<!-- Premier element focalisable de la page : il donne au clavier un moyen de
     sauter la navigation sans la traverser entree par entree. -->
<a
	href="#contenu"
	class="bg-ink text-paper rounded-pill sr-only px-5 py-3 font-semibold focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-100"
>
	Aller au contenu
</a>

<div class="flex min-h-full flex-col">
	<Header />
	<main id="contenu" class="flex-1">
		{@render children()}
	</main>
	<Footer />
</div>
