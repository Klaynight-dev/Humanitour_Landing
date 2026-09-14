<script lang="ts">
	import { page } from '$app/state';
	import { LINKS, NAV, SITE } from '$lib/shared/site';
	import Button from './Button.svelte';
	import Logo from './Logo.svelte';

	let open = $state(false);

	// La navigation au clavier et le lecteur d ecran ont besoin de savoir quelle
	// entree correspond a la page courante : `aria-current` le dit, la couleur
	// seule ne suffit pas.
	function isCurrent(href: string): boolean {
		return page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
	}
</script>

<header class="border-ink bg-cream/95 sticky top-0 z-50 border-b-2 backdrop-blur-md">
	<div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
		<a href="/" class="flex items-center gap-2.5" aria-label="{SITE.name}, accueil">
			<Logo size={40} />
			<span class="flex flex-col leading-none">
				<span class="font-display text-xl font-black tracking-tight uppercase">{SITE.name}</span>
				<span class="text-muted mt-0.5 hidden text-[10px] font-semibold tracking-[0.14em] uppercase sm:block">
					{SITE.tagline}
				</span>
			</span>
		</a>

		<nav class="hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
			{#each NAV as item (item.href)}
				<a
					href={item.href}
					aria-current={isCurrent(item.href) ? 'page' : undefined}
					class="rounded-pill px-3.5 py-2 text-sm font-bold transition-colors"
					class:bg-ink={isCurrent(item.href)}
					class:text-white={isCurrent(item.href)}
					class:text-ink={!isCurrent(item.href)}
					class:hover:bg-surface={!isCurrent(item.href)}
				>
					{item.label}
				</a>
			{/each}
		</nav>

		<div class="hidden items-center gap-2 lg:flex">
			<Button href={LINKS.discord.href} external variant="ghost">Discord</Button>
			<Button href={LINKS.helloasso.href} external variant="gradient">Soutenir</Button>
		</div>

		<button
			type="button"
			class="brut-sm border-ink rounded-lg border-2 p-2 lg:hidden"
			aria-expanded={open}
			aria-controls="menu-mobile"
			onclick={() => (open = !open)}
		>
			<span class="sr-only">{open ? 'Fermer le menu' : 'Ouvrir le menu'}</span>
			<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				{#if open}
					<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.5" />
				{:else}
					<path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.5" />
				{/if}
			</svg>
		</button>
	</div>

	{#if open}
		<div id="menu-mobile" class="border-ink bg-cream border-t-2 lg:hidden">
			<nav class="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3" aria-label="Navigation mobile">
				{#each NAV as item (item.href)}
					<a
						href={item.href}
						aria-current={isCurrent(item.href) ? 'page' : undefined}
						class="rounded-lg px-3 py-2.5 font-bold"
						class:bg-ink={isCurrent(item.href)}
						class:text-white={isCurrent(item.href)}
						onclick={() => (open = false)}
					>
						{item.label}
					</a>
				{/each}
				<div class="mt-2 flex flex-col gap-2">
					<Button href={LINKS.discord.href} external variant="outline">Rejoindre le Discord</Button>
					<Button href={LINKS.helloasso.href} external variant="gradient">
						Soutenir le projet
					</Button>
				</div>
			</nav>
		</div>
	{/if}
</header>
