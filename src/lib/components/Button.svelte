<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'gradient' | 'outline' | 'ghost';
	type Size = 'md' | 'lg';

	interface Props {
		variant?: Variant;
		size?: Size;
		href?: string;
		/** Ouvre dans un nouvel onglet et pose rel="noopener". */
		external?: boolean;
		children: Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		href,
		external = false,
		children,
		...rest
	}: Props & HTMLAnchorAttributes & HTMLButtonAttributes = $props();

	/**
	 * Les variantes portent le trait noir et l'ombre nette, sauf « ghost » qui
	 * n'est pas un bloc mais un lien deguise en bouton.
	 */
	const VARIANTS: Record<Variant, string> = {
		primary: 'brut brut-press bg-ink text-white',
		gradient: 'brut brut-press text-ink',
		outline: 'brut brut-press bg-paper text-ink',
		ghost: 'text-ink hover:bg-ink/5 border-2 border-transparent'
	};

	const SIZES: Record<Size, string> = {
		md: 'px-5 py-2.5 text-sm',
		lg: 'px-7 py-3.5 text-base'
	};

	const base =
		'inline-flex items-center justify-center gap-2 rounded-pill font-display font-bold tracking-tight disabled:cursor-not-allowed disabled:opacity-50';

	// $derived et non const : sans cela la classe figerait la valeur initiale des
	// props et un changement de variante ne se verrait jamais.
	const className = $derived(`${base} ${VARIANTS[variant]} ${SIZES[size]}`);
	const style = $derived(
		variant === 'gradient' ? 'background-image: var(--gradient-line)' : undefined
	);
</script>

{#if href}
	<a
		{href}
		class={className}
		{style}
		target={external ? '_blank' : undefined}
		rel={external ? 'noopener noreferrer' : undefined}
		{...rest}
	>
		{@render children()}
	</a>
{:else}
	<button class={className} {style} {...rest}>
		{@render children()}
	</button>
{/if}
