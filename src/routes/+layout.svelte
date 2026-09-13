<script lang="ts">
	import '../app.css';
	import Footer from '$components/Footer.svelte';
	import Header from '$components/Header.svelte';

	let { children } = $props();
</script>

<a
	href="#contenu"
	class="bg-ink text-paper sr-only rounded-lg px-4 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100]"
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
