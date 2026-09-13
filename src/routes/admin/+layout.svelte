<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { can, type Permission } from '$lib/shared/permissions';
	import { SITE } from '$lib/shared/site';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	let open = $state(false);

	/**
	 * Le menu n'affiche que ce que le compte peut ouvrir.
	 *
	 * Une entree menant a un 403 est une promesse non tenue : la permission decide
	 * de l'affichage comme elle decide de l'acces.
	 */
	const SECTIONS: { href: string; label: string; permission: Permission }[] = [
		{ href: '/admin/sondages', label: 'Sondages', permission: 'survey.read' },
		{ href: '/admin/medias', label: 'Mediatheque', permission: 'media.read' },
		{ href: '/admin/equipe', label: 'Equipe', permission: 'user.read' },
		{ href: '/admin/roles', label: 'Roles', permission: 'role.manage' },
		{ href: '/admin/reglages', label: 'Reglages', permission: 'settings.manage' },
		{ href: '/admin/journal', label: 'Journal', permission: 'audit.read' }
	];

	const visible = $derived(SECTIONS.filter((section) => can(data.user, section.permission)));

	function isCurrent(href: string): boolean {
		return page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
	}
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="bg-surface min-h-full">
	<header class="border-line bg-paper border-b">
		<div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
			<a href="/admin" class="flex items-center gap-2.5">
				<span class="surface-mesh h-8 w-8 rounded-lg" aria-hidden="true"></span>
				<span class="font-display font-semibold">{SITE.name}</span>
				<span class="text-muted hidden text-xs tracking-wide uppercase sm:inline">
					back-office
				</span>
			</a>

			<div class="flex items-center gap-3">
				<div class="hidden text-right sm:block">
					<p class="text-sm font-semibold">{data.user.displayName}</p>
					<p class="text-muted text-xs">{data.user.role.name}</p>
				</div>
				<form method="POST" action="/deconnexion">
					<button
						type="submit"
						class="border-line hover:bg-surface rounded-pill border px-3.5 py-1.5 text-sm font-medium"
					>
						Se deconnecter
					</button>
				</form>
				<button
					type="button"
					class="hover:bg-surface rounded-lg p-2 lg:hidden"
					aria-expanded={open}
					onclick={() => (open = !open)}
				>
					<span class="sr-only">Menu</span>
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" />
					</svg>
				</button>
			</div>
		</div>
	</header>

	<div class="mx-auto flex max-w-7xl gap-8 px-4 py-8 sm:px-6">
		<nav
			class="w-52 shrink-0 lg:block"
			class:hidden={!open}
			class:absolute={open}
			aria-label="Sections du back-office"
		>
			<ul class="flex flex-col gap-1">
				{#each visible as section (section.href)}
					<li>
						<a
							href={section.href}
							aria-current={isCurrent(section.href) ? 'page' : undefined}
							class="block rounded-lg px-3 py-2 text-sm font-medium"
							class:bg-ink={isCurrent(section.href)}
							class:text-paper={isCurrent(section.href)}
							class:hover:bg-paper={!isCurrent(section.href)}
						>
							{section.label}
						</a>
					</li>
				{/each}
			</ul>
			<a href="/" class="text-muted mt-6 block px-3 text-xs underline">Voir le site public</a>
		</nav>

		<main class="min-w-0 flex-1">
			{@render children()}
		</main>
	</div>
</div>
