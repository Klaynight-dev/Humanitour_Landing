<script lang="ts">
	import { page } from '$app/state';
	import { LINKS, NAV, SITE } from '$lib/shared/site';

	let open = $state(false);
	let toggleEl: HTMLButtonElement | undefined = $state();

	// La navigation au clavier et le lecteur d ecran ont besoin de savoir quelle
	// entree correspond a la page courante : `aria-current` le dit, la couleur
	// seule ne suffit pas.
	function isCurrent(href: string): boolean {
		return page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
	}

	// Echap referme et rend le focus au bouton : sans ce retour, le focus reste
	// dans un menu qui n est plus affiche.
	function onKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape' || !open) return;
		open = false;
		toggleEl?.focus();
	}
</script>

<svelte:window onkeydown={onKeydown} />

<!--
	En-tete colle. C est la seule surface du site qui passe reellement au-dessus
	du contenu : elle est donc la seule a porter l ombre `shadow-lift`. Fond
	opaque et non floute, la charte n ayant aucune transparence.
-->
<header class="bg-cream sticky top-0 z-50" style="box-shadow: var(--shadow-lift)">
	<div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
		<a href="/" class="flex items-center py-1" aria-label="{SITE.name}, accueil">
			<img
				src="/logo-lockup-ink.png"
				alt={SITE.name}
				width="1200"
				height="335"
				class="h-8 w-auto sm:h-9"
			/>
		</a>

		<nav class="hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
			{#each NAV as item (item.href)}
				{@const current = isCurrent(item.href)}
				<!-- La page courante se signale par un aplat plein, pas par une seule
				     couleur : un daltonien doit pouvoir la reperer aussi. -->
				<a
					href={item.href}
					aria-current={current ? 'page' : undefined}
					class="rounded-pill px-4 py-2.5 text-sm font-semibold transition-colors {current
						? 'bg-ink text-paper'
						: 'hover:bg-ink/8'}"
				>
					{item.label}
				</a>
			{/each}
		</nav>

		<div class="hidden items-center gap-4 lg:flex">
			<a
				href={LINKS.discord.href}
				target="_blank"
				rel="noopener noreferrer"
				class="rounded-pill px-3 py-2.5 text-sm font-semibold underline decoration-2 underline-offset-4"
			>
				Discord
			</a>
			<a
				href={LINKS.helloasso.href}
				target="_blank"
				rel="noopener noreferrer"
				class="surface-brand press rounded-pill px-5 py-2.5 text-sm font-semibold"
			>
				Adhérer
			</a>
		</div>

		<!-- Le libelle « Menu » reste visible : une icone seule suppose que le
		     visiteur sait deja qu un menu se cache derriere trois traits. -->
		<button
			bind:this={toggleEl}
			type="button"
			class="border-ink flex min-h-11 items-center gap-2 rounded-pill border-2 px-4 py-2 text-sm font-semibold lg:hidden"
			aria-expanded={open}
			aria-controls="menu-mobile"
			onclick={() => (open = !open)}
		>
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				{#if open}
					<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.5" />
				{:else}
					<path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.5" />
				{/if}
			</svg>
			{open ? 'Fermer' : 'Menu'}
		</button>
	</div>

	{#if open}
		<div id="menu-mobile" class="bg-cream border-ink/10 border-t lg:hidden">
			<nav class="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3" aria-label="Navigation mobile">
				{#each NAV as item (item.href)}
					{@const current = isCurrent(item.href)}
					<a
						href={item.href}
						aria-current={current ? 'page' : undefined}
						class="rounded-pill px-4 py-3 font-semibold {current ? 'bg-ink text-paper' : ''}"
						onclick={() => (open = false)}
					>
						{item.label}
					</a>
				{/each}
				<div class="mt-2 flex flex-col gap-2">
					<a
						href={LINKS.discord.href}
						target="_blank"
						rel="noopener noreferrer"
						class="border-ink rounded-pill border-2 px-5 py-3 text-center font-semibold"
					>
						Rejoindre le Discord
					</a>
					<a
						href={LINKS.helloasso.href}
						target="_blank"
						rel="noopener noreferrer"
						class="surface-brand rounded-pill px-5 py-3 text-center font-semibold"
					>
						Adhérer à l'association
					</a>
				</div>
			</nav>
		</div>
	{/if}
</header>
