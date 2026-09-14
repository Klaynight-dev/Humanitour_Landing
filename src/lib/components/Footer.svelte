<script lang="ts">
	import { LEGAL_PAGES, LICENSES, LINKS, NAV, ORGANISATION, SITE } from '$lib/shared/site';
	import Logo from './Logo.svelte';

	const year = new Date().getFullYear();
</script>

<footer class="border-ink bg-ink mt-24 border-t-2 text-white">
	<div class="mx-auto max-w-6xl px-4 py-14 sm:px-6">
		<div class="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
			<div class="flex flex-col gap-3">
				<div class="flex items-center gap-2.5">
					<Logo size={36} />
					<span class="font-display text-xl font-black tracking-tight uppercase">{SITE.name}</span>
				</div>
				<p class="font-hand text-2xl text-white/90">{SITE.tagline}</p>
				<p class="text-sm text-white/60">
					{ORGANISATION.form}<br />
					RNA {ORGANISATION.rna}
				</p>
			</div>

			<nav aria-labelledby="footer-nav" class="flex flex-col gap-2">
				<h2 id="footer-nav" class="font-display text-sm font-bold tracking-wide uppercase">
					Le site
				</h2>
				{#each NAV as item (item.href)}
					<a href={item.href} class="text-sm text-white/70 hover:text-white">{item.label}</a>
				{/each}
				<a href="/donnees" class="text-sm text-white/70 hover:text-white">Donnees brutes</a>
			</nav>

			<nav aria-labelledby="footer-legal" class="flex flex-col gap-2">
				<h2 id="footer-legal" class="font-display text-sm font-bold tracking-wide uppercase">
					Informations legales
				</h2>
				{#each LEGAL_PAGES as item (item.slug)}
					<a href="/legal/{item.slug}" class="text-sm text-white/70 hover:text-white">
						{item.short}
					</a>
				{/each}
			</nav>

			<div class="flex flex-col gap-2">
				<h2 class="font-display text-sm font-bold tracking-wide uppercase">Nous suivre</h2>
				{#each [LINKS.discord, LINKS.helloasso, LINKS.forms, LINKS.repository] as link (link.href)}
					<a
						href={link.href}
						target="_blank"
						rel="noopener noreferrer"
						class="text-sm text-white/70 hover:text-white"
					>
						{link.label}
					</a>
				{/each}
				<a href="mailto:{SITE.email}" class="text-sm text-white/70 hover:text-white">
					{SITE.email}
				</a>
			</div>
		</div>

		<div
			class="mt-12 flex flex-col gap-3 border-t border-white/20 pt-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between"
		>
			<p>
				© {year}
				{ORGANISATION.legalName}. Directeur de publication : {ORGANISATION.publicationDirector}.
			</p>
			<p>
				Code sous
				<a class="underline hover:text-white" href={LICENSES.code.url} target="_blank" rel="noopener noreferrer">
					{LICENSES.code.name}
				</a>
				— donnees sous
				<a class="underline hover:text-white" href={LICENSES.data.url} target="_blank" rel="noopener noreferrer">
					{LICENSES.data.name}
				</a>
			</p>
		</div>
	</div>
</footer>
