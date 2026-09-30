<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { formatCount } from '$lib/shared/format';
	import { DEFAULT_VIEW, FOLDER_VIEWS } from '$lib/shared/mail/folders';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const base = $derived(`/admin/courrier/${data.mailbox.id}`);

	// Flux temps reel de la boite : un courriel arrive, la liste et les compteurs
	// se rechargent sans action. Le navigateur se reconnecte seul ; a chaque
	// reconnexion on recharge, pour rattraper ce qui a pu arriver entre-temps.
	onMount(() => {
		const source = new EventSource(`${base}/evenements`);
		let opened = false;
		let timer: ReturnType<typeof setTimeout> | undefined;
		const refresh = () => {
			clearTimeout(timer);
			timer = setTimeout(() => invalidate('mail:live'), 150);
		};

		source.addEventListener('mail', refresh);
		source.addEventListener('open', () => {
			if (opened) refresh();
			opened = true;
		});

		return () => {
			clearTimeout(timer);
			source.close();
		};
	});

	/** La vue en cours, seulement sur la liste : dans un fil, aucun dossier n'est « ouvert ». */
	const currentView = $derived(
		page.url.pathname === base ? (page.url.searchParams.get('dossier') ?? DEFAULT_VIEW) : null
	);
</script>

<!--
	Deux colonnes des l'ecran large : les boites et les dossiers a gauche, le
	travail a droite. Sur telephone, la colonne passe au-dessus et ses liens
	vont a la ligne : rien ne deborde, et le bouton de redaction reste le
	premier element atteint.
-->
<div class="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
	<aside class="flex flex-col gap-5" aria-label="Boîtes et dossiers">
		<a
			href="{base}/nouveau"
			class="bg-ink text-paper press rounded-pill inline-flex min-h-11 items-center justify-center px-4 py-2 text-sm font-semibold"
		>
			Nouveau message
		</a>

		<nav aria-label="Dossiers de {data.mailbox.address}">
			<ul class="flex flex-wrap gap-1 lg:flex-col">
				{#each FOLDER_VIEWS as view (view.key)}
					{@const current = currentView === view.key}
					<li>
						<a
							href="{base}?dossier={view.key}"
							aria-current={current ? 'page' : undefined}
							class="rounded-field flex min-h-11 items-center justify-between gap-3 px-3 py-2 text-sm {current
								? 'bg-ink text-paper font-semibold'
								: 'hover:bg-paper'}"
						>
							<span>{view.label}</span>
							{#if view.key === 'reception'}
								{@const unread =
									data.mailboxes.find((mailbox) => mailbox.id === data.mailbox.id)?.unread ?? 0}
								{#if unread > 0}
									<span class="font-mono text-xs font-semibold">
										{formatCount(unread)}<span class="sr-only"> non lus</span>
									</span>
								{/if}
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<nav aria-label="Boîtes">
			<h2 class="text-muted mb-1 px-3 text-xs font-semibold">Boîtes</h2>
			<ul class="flex flex-col gap-1">
				{#each data.mailboxes as mailbox (mailbox.id)}
					{@const current = mailbox.id === data.mailbox.id}
					<li>
						<a
							href="/admin/courrier/{mailbox.id}"
							aria-current={current ? 'true' : undefined}
							class="rounded-field flex min-h-11 flex-col justify-center px-3 py-1.5 text-sm {current
								? 'bg-paper border-ink/15 border'
								: 'hover:bg-paper'}"
						>
							<span class="flex items-center justify-between gap-2">
								<span class="truncate font-semibold">{mailbox.displayName}</span>
								{#if mailbox.unread > 0}
									<span class="font-mono text-xs">
										{formatCount(mailbox.unread)}<span class="sr-only"> non lus</span>
									</span>
								{/if}
							</span>
							<span class="text-muted truncate text-xs">
								{mailbox.address}{mailbox.kind === 'PERSONAL' ? ' · personnelle' : ''}
							</span>
						</a>
					</li>
				{/each}
			</ul>
			{#if data.canManage}
				<a
					href="/admin/courrier/boites"
					class="text-muted mt-2 inline-flex min-h-11 items-center px-3 text-sm underline decoration-2 underline-offset-2"
				>
					Gérer les boîtes
				</a>
			{/if}
		</nav>
	</aside>

	<div class="min-w-0">
		{#if !data.mailConfigured}
			<p class="panel mb-4 px-4 py-3 text-sm" role="alert">
				L'envoi n'est pas configuré : <code class="font-mono text-xs">RESEND_TOKEN</code> manque. Le courrier
				reçu s'affiche, mais rien ne partira d'ici.
			</p>
		{/if}
		{@render children()}
	</div>
</div>
