<script lang="ts">
	import Button from '$components/Button.svelte';
	import type { SurfaceKey } from '$lib/shared/content/blocks/common';
	import { readString } from '$lib/shared/content/fields';
	import { buttonVariantFor } from './surfaces';

	interface Props {
		items: readonly Record<string, unknown>[];
		surface: SurfaceKey;
		size?: 'md' | 'lg';
		class?: string;
		/** Rang dans la choregraphie d'entree de la couverture, en millisecondes. */
		delay?: string;
	}

	let { items, surface, size = 'lg', class: className = 'mt-8', delay }: Props = $props();

	/**
	 * Une adresse hors du site s'ouvre dans un nouvel onglet.
	 *
	 * Deduit de l'adresse plutot que demande au back-office : la question « faut-il
	 * cocher nouvel onglet ? » n'a qu'une bonne reponse, et la poser c'est
	 * accepter qu'elle soit parfois mal repondue.
	 */
	function isExternal(href: string): boolean {
		return href.startsWith('http://') || href.startsWith('https://');
	}
</script>

{#if items.length > 0}
	<div
		class="flex flex-wrap gap-3 {className}"
		style={delay === undefined ? undefined : `--enter-delay: ${delay}`}
	>
		{#each items as item, index (index)}
			{@const href = readString(item, 'href')}
			{@const label = readString(item, 'label')}
			{#if href && label}
				<Button
					{href}
					{size}
					external={isExternal(href)}
					variant={buttonVariantFor(readString(item, 'variant') ?? 'primary', surface)}
				>
					{label}
				</Button>
			{/if}
		{/each}
	</div>
{/if}
