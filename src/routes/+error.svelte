<script lang="ts">
	import { page } from '$app/state';
	import Button from '$components/Button.svelte';
	import { SITE } from '$lib/shared/site';

	/**
	 * Page d'erreur unique du site : 404, 500, et tout ce que SvelteKit route
	 * ici faute de `+error.svelte` plus specifique. Racine de `src/routes`,
	 * donc hors du chrome public et du back-office (Header/Footer/nav
	 * d'admin) : c'est un ecran a part, pas une page habillee comme les autres.
	 *
	 * Deux registres, comme partout ailleurs sur le site (DESIGN.md « Les deux
	 * registres ») : l'aplat noir plein de la couverture d'accueil, degrade
	 * uniquement dans le titre, sur les pages argument/editorial ; sobre et
	 * immobile sur /donnees, /methodologie et le back-office, qui ne portent
	 * jamais de degrade ni de mouvement.
	 */

	const SOBER_PREFIXES = ['/donnees', '/methodologie', '/admin'];

	const isSober = $derived(
		SOBER_PREFIXES.some(
			(prefix) => page.url.pathname === prefix || page.url.pathname.startsWith(`${prefix}/`)
		)
	);
	const isFracture = $derived(page.status >= 500);

	const copy = $derived.by(() => {
		if (page.status === 404) {
			return {
				title: 'On ne l’a pas retrouvée.',
				body: 'La page que vous cherchez a disparu, ou son adresse a changé. Les deux boucles du logo se cherchent encore — pendant ce temps, voici où aller.',
				primary: { label: 'Retour à l’accueil', href: '/' },
				secondary: { label: 'Voir les données', href: '/donnees' }
			};
		}
		if (isFracture) {
			return {
				title: 'Ça s’est cassé de notre côté.',
				body: 'Une erreur est survenue sur nos serveurs. Ce n’est pas vous, c’est nous — l’équipe technique est prévenue.',
				primary: { label: 'Réessayer', href: page.url.href },
				secondary: { label: 'Retour à l’accueil', href: '/' }
			};
		}
		return {
			title: 'Quelque chose a mal tourné.',
			body: page.error?.message ?? `Erreur ${page.status}.`,
			primary: { label: 'Retour à l’accueil', href: '/' },
			secondary: { label: 'Nous écrire', href: `mailto:${SITE.email}` }
		};
	});
</script>

<svelte:head>
	<title>Erreur {page.status}, {SITE.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#if isSober}
	<!-- Registre chiffres/outil : aucun degrade, aucun mouvement, comme
	     /donnees, /methodologie et le back-office (DESIGN.md). -->
	<div
		class="bg-paper text-ink flex min-h-dvh flex-col items-center justify-center px-6 py-24 text-center"
	>
		<svg width="120" height="72" viewBox="0 0 120 72" aria-hidden="true" class="mb-6 opacity-55">
			<circle cx="42" cy="36" r="30" fill="none" stroke="currentColor" stroke-width="1.5" />
			<circle cx="78" cy="36" r="30" fill="none" stroke="currentColor" stroke-width="1.5" />
		</svg>
		<span
			class="font-mono border-ink/20 mb-4 rounded-pill border px-4 py-1.5 text-xs tracking-[0.14em] uppercase"
		>
			Erreur · {page.status}
		</span>
		<h1 class="max-w-lg text-3xl sm:text-4xl">{copy.title}</h1>
		<p class="measure text-ink-soft mt-4">{copy.body}</p>
		<div class="mt-8 flex flex-wrap justify-center gap-3">
			<Button href={copy.primary.href} variant="primary">{copy.primary.label}</Button>
			<Button href={copy.secondary.href} variant="outline">{copy.secondary.label}</Button>
		</div>
	</div>
{:else}
	<!-- Registre argument/editorial : aplat noir plein, comme la couverture de
	     l'accueil. Le degrade vit dans le titre, pas derriere. -->
	<div
		class="bg-ink text-paper flex min-h-dvh flex-col items-center justify-center px-6 py-24 text-center"
	>
		<div class="flex max-w-xl flex-col items-center gap-5">
			<span
				class="font-mono border-paper/35 rounded-pill border px-4 py-1.5 text-xs tracking-[0.14em] uppercase"
			>
				Erreur · {page.status}
			</span>
			<h1 class="error-title">{copy.title}</h1>
			<p class="measure text-paper/90">{copy.body}</p>
			<div class="mt-3 flex flex-wrap justify-center gap-3">
				<Button href={copy.primary.href} variant="brand">{copy.primary.label}</Button>
				<Button href={copy.secondary.href} variant="inverse">{copy.secondary.label}</Button>
			</div>
		</div>
	</div>
{/if}

<style>
	/*
	 * Le degrade en remplissage de texte, comme les chiffres d'affiche de la
	 * couverture d'accueil sur aplat noir (DESIGN.md « Palette »). `text-gradient`
	 * d'app.css ne convient pas ici : sa reserve `@supports` retombe sur
	 * `--color-coral-ink`, un correctif pour fond clair qui sur le noir ne
	 * donnerait que 3,3:1. Le corail plein de la charte y donne 6,75:1.
	 */
	.error-title {
		background-image: var(--gradient-brand);
		background-clip: text;
		color: transparent;
	}

	@supports not (background-clip: text) {
		.error-title {
			color: var(--color-coral);
		}
	}
</style>
