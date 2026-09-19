<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import CommandPalette from '$components/admin/CommandPalette.svelte';
	import NotificationBell from '$components/admin/NotificationBell.svelte';
	import { can, type Permission } from '$lib/shared/permissions';
	import { SITE } from '$lib/shared/site';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	let open = $state(false);
	let toggleEl: HTMLButtonElement | undefined = $state();

	/**
	 * Le menu n'affiche que ce que le compte peut ouvrir.
	 *
	 * Une entree menant a un 403 est une promesse non tenue : la permission decide
	 * de l'affichage comme elle decide de l'acces.
	 */
	const SECTIONS: { href: string; label: string; permission: Permission }[] = [
		{ href: '/admin/sondages', label: 'Sondages', permission: 'survey.read' },
		{ href: '/admin/medias', label: 'Médiathèque', permission: 'media.read' },
		{ href: '/admin/contenu', label: 'Contenu du site', permission: 'content.read' },
		{ href: '/admin/equipe', label: 'Équipe', permission: 'user.read' },
		{ href: '/admin/roles', label: 'Rôles', permission: 'role.manage' },
		{ href: '/admin/reglages', label: 'Réglages', permission: 'settings.manage' },
		{ href: '/admin/journal', label: 'Journal', permission: 'audit.read' }
	];

	const visible = $derived(SECTIONS.filter((section) => can(data.user, section.permission)));

	function isCurrent(href: string): boolean {
		return page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape' || !open) return;
		open = false;
		toggleEl?.focus();
	}
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
</svelte:head>

<svelte:window onkeydown={onKeydown} />

<CommandPalette />

<!--
	Back-office. Meme charte que le site public, mais au cadran le plus bas :
	Jost partout, aplats sobres, aucune surface de marque hors du sigle. C est un
	ecran de travail, pas une affiche.
-->
<a
	href="#contenu"
	class="bg-ink text-paper rounded-pill sr-only px-5 py-3 font-semibold focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-100"
>
	Aller au contenu
</a>

<div class="bg-cream min-h-full">
	<header class="border-ink/12 bg-paper border-b">
		<!-- `flex-wrap` : a 320px, le sigle, l identite du compte et les deux
		     commandes ne tiennent pas sur une ligne et poussaient la page en
		     defilement horizontal. Elles passent a la ligne plutot que de deborder. -->
		<div
			class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-6"
		>
			<a href="/admin" class="flex items-center gap-2.5 py-1">
				<span class="surface-brand rounded-field h-8 w-8" aria-hidden="true"></span>
				<span class="font-semibold">{SITE.name}</span>
				<span class="text-muted hidden text-sm sm:inline">back-office</span>
			</a>

			<div class="flex items-center gap-3">
				<!-- Recherche en formulaire GET : elle marche sans JavaScript, et son
				     resultat est une adresse partageable comme le reste du back-office. -->
				<form method="GET" action="/admin/recherche" class="hidden md:block">
					<label class="sr-only" for="recherche-admin">Rechercher</label>
					<input
						id="recherche-admin"
						type="search"
						name="q"
						placeholder="Rechercher   Ctrl+K"
						class="border-ink/20 bg-paper rounded-pill min-h-11 w-44 border px-4 py-2 text-sm lg:w-56"
					/>
				</form>

				<NotificationBell initial={data.unreadNotifications} />

				<div class="hidden text-right sm:block">
					<p class="text-sm font-semibold">{data.user.displayName}</p>
					<p class="text-muted text-sm">{data.user.role.name}</p>
				</div>
				<form method="POST" action="/deconnexion">
					<button
						type="submit"
						class="border-ink/20 hover:bg-cream rounded-pill min-h-11 border px-4 py-2 text-sm font-medium inline-flex items-center justify-center"
					>
						Se déconnecter
					</button>
				</form>
				<!-- Libelle visible plutot qu une icone seule : le menu tient la seule
				     voie vers les autres sections sur mobile. -->
				<button
					bind:this={toggleEl}
					type="button"
					class="border-ink/20 hover:bg-cream rounded-pill flex min-h-11 items-center gap-2 border px-4 py-2 text-sm font-medium lg:hidden"
					aria-expanded={open}
					aria-controls="sections-admin"
					onclick={() => (open = !open)}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						{#if open}
							<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.5" />
						{:else}
							<path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.5" />
						{/if}
					</svg>
					Sections
				</button>
			</div>
		</div>
	</header>

	<!--
		Le menu se plie dans le flux au lieu de se poser en absolu : la version
		precedente passait en `absolute` sans contexte de positionnement, donc le
		panneau recouvrait le contenu au lieu de le pousser.
	-->
	<div class="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:gap-8 lg:py-8">
		<nav
			id="sections-admin"
			class="shrink-0 lg:block lg:w-52"
			class:hidden={!open}
			aria-label="Sections du back-office"
		>
			<ul class="flex flex-col gap-1">
				<!-- Le champ de recherche de l'en-tete disparait sous `md` : sans cette
				     entree, la recherche serait inatteignable sur telephone. -->
				<li class="md:hidden">
					<a
						href="/admin/recherche"
						aria-current={isCurrent('/admin/recherche') ? 'page' : undefined}
						class="rounded-field flex min-h-11 items-center px-3.5 py-2 font-medium {isCurrent(
							'/admin/recherche'
						)
							? 'bg-ink text-paper'
							: 'hover:bg-paper'}"
						onclick={() => (open = false)}
					>
						Rechercher
					</a>
				</li>
				{#each visible as section (section.href)}
					{@const current = isCurrent(section.href)}
					<li>
						<a
							href={section.href}
							aria-current={current ? 'page' : undefined}
							class="rounded-field flex min-h-11 items-center px-3.5 py-2 font-medium {current
								? 'bg-ink text-paper'
								: 'hover:bg-paper'}"
							onclick={() => (open = false)}
						>
							{section.label}
						</a>
					</li>
				{/each}
			</ul>
			<a
				href="/"
				class="text-muted mt-6 inline-block px-3.5 text-sm underline decoration-2 underline-offset-2"
			>
				Voir le site public
			</a>
		</nav>

		<main id="contenu" class="min-w-0 flex-1">
			{@render children()}
		</main>
	</div>
</div>
