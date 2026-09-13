<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'outline' | 'ghost';
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

	const VARIANTS: Record<Variant, string> = {
		primary: 'bg-ink text-paper hover:bg-coral-600',
		outline: 'border-2 border-ink text-ink hover:bg-ink hover:text-paper',
		ghost: 'text-ink hover:bg-ink/5'
	};

	const SIZES: Record<Size, string> = {
		md: 'px-5 py-2.5 text-sm',
		lg: 'px-7 py-3.5 text-base'
	};

	const base =
		'inline-flex items-center justify-center gap-2 rounded-pill font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50';

	// $derived et non const : sans cela la classe figerait la valeur initiale des
	// props et un changement de variante ne se verrait jamais.
	const className = $derived(`${base} ${VARIANTS[variant]} ${SIZES[size]}`);
</script>

{#if href}
	<a
		{href}
		class={className}
		target={external ? '_blank' : undefined}
		rel={external ? 'noopener noreferrer' : undefined}
		{...rest}
	>
		{@render children()}
	</a>
{:else}
	<button class={className} {...rest}>
		{@render children()}
	</button>
{/if}
