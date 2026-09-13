<script lang="ts">
	import { LEGAL_PAGES, LICENSES, LINKS, NAV, ORGANISATION, SITE } from '$lib/shared/site';

	const year = new Date().getFullYear();
</script>

<footer class="border-line bg-surface mt-24 border-t">
	<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
		<div class="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
			<div class="flex flex-col gap-3">
				<div class="flex items-center gap-2.5">
					<span class="surface-mesh h-8 w-8 rounded-lg" aria-hidden="true"></span>
					<span class="font-display text-lg font-semibold">{SITE.name}</span>
				</div>
				<p class="text-muted text-sm">{SITE.tagline}</p>
				<p class="text-muted text-sm">
					{ORGANISATION.form}<br />
					RNA {ORGANISATION.rna}
				</p>
			</div>

			<nav aria-labelledby="footer-nav" class="flex flex-col gap-2">
				<h2 id="footer-nav" class="font-display text-sm font-semibold">Le site</h2>
				{#each NAV as item (item.href)}
					<a href={item.href} class="text-muted hover:text-ink text-sm">{item.label}</a>
				{/each}
				<a href="/donnees/exports" class="text-muted hover:text-ink text-sm">Donnees brutes</a>
			</nav>

			<nav aria-labelledby="footer-legal" class="flex flex-col gap-2">
				<h2 id="footer-legal" class="font-display text-sm font-semibold">Informations legales</h2>
				{#each LEGAL_PAGES as item (item.slug)}
					<a href="/legal/{item.slug}" class="text-muted hover:text-ink text-sm">{item.short}</a>
				{/each}
			</nav>

			<div class="flex flex-col gap-2">
				<h2 class="font-display text-sm font-semibold">Nous suivre</h2>
				{#each [LINKS.discord, LINKS.helloasso, LINKS.forms, LINKS.repository] as link (link.href)}
					<a
						href={link.href}
						target="_blank"
						rel="noopener noreferrer"
						class="text-muted hover:text-ink text-sm"
					>
						{link.label}
					</a>
				{/each}
				<a href="mailto:{SITE.email}" class="text-muted hover:text-ink text-sm">{SITE.email}</a>
			</div>
		</div>

		<div
			class="border-line text-muted mt-10 flex flex-col gap-3 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between"
		>
			<p>© {year} {ORGANISATION.legalName}. Directeur de publication : {ORGANISATION.publicationDirector}.</p>
			<p>
				Code sous
				<a class="underline" href={LICENSES.code.url} target="_blank" rel="noopener noreferrer">
					{LICENSES.code.name}
				</a>
				— donnees sous
				<a class="underline" href={LICENSES.data.url} target="_blank" rel="noopener noreferrer">
					{LICENSES.data.name}
				</a>
			</p>
		</div>
	</div>
</footer>
