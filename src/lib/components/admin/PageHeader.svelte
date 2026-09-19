<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		description?: string;
		/** Fil d'Ariane : chaque entree est un couple libelle / adresse. */
		breadcrumb?: { label: string; href: string }[];
		actions?: Snippet;
	}

	let { title, description, breadcrumb = [], actions }: Props = $props();
</script>

<header class="mb-8">
	{#if breadcrumb.length > 0}
		<nav class="text-muted mb-2 text-sm" aria-label="Fil d'Ariane">
			{#each breadcrumb as crumb, index (crumb.href)}
				{#if index > 0}<span aria-hidden="true"> / </span>{/if}
				<a href={crumb.href} class="hover:text-ink underline decoration-2 underline-offset-2">{crumb.label}</a>
			{/each}
		</nav>
	{/if}

	<div class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<!-- Le back-office reste en Jost : Bowlby One est une fonte d affiche, elle
			     ecrase un ecran de travail consulte toute la journee. -->
			<h1 class="font-sans text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
			{#if description}
				<p class="text-muted mt-1.5 max-w-2xl text-sm">{description}</p>
			{/if}
		</div>
		{#if actions}
			<div class="flex flex-wrap gap-2">{@render actions()}</div>
		{/if}
	</div>
</header>
