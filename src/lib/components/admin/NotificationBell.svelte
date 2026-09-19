<script lang="ts">
	import { page } from '$app/state';

	interface Props {
		/** Compteur calcule au chargement de la page, donc juste a l'arrivee. */
		initial: number;
	}

	let { initial }: Props = $props();

	/**
	 * Dernier compteur obtenu par sondage, `null` tant qu'il n'y en a pas eu.
	 *
	 * Le compteur du serveur reprend la main a chaque navigation : il est calcule
	 * dans le `load` du layout, donc plus frais que n'importe quel sondage.
	 */
	let polled: number | null = $state(null);

	const unread = $derived(polled ?? initial);

	$effect(() => {
		void initial;
		polled = null;
	});

	const INTERVAL = 20_000;

	$effect(() => {
		const timer = setInterval(async () => {
			// Onglet en arriere-plan : inutile d'interroger le serveur, la prochaine
			// navigation ou le retour au premier plan rafraichira.
			if (document.hidden) return;

			try {
				const response = await fetch('/admin/api/notifications');
				if (!response.ok) return;
				const payload: { unread: number } = await response.json();
				polled = payload.unread;
			} catch {
				// Une coupure reseau laisse simplement le compteur en l'etat.
			}
		}, INTERVAL);

		return () => clearInterval(timer);
	});

	const current = $derived(page.url.pathname.startsWith('/admin/notifications'));
</script>

<a
	href="/admin/notifications"
	aria-current={current ? 'page' : undefined}
	class="border-ink/20 hover:bg-cream rounded-pill relative inline-flex min-h-11 items-center gap-2 border px-4 py-2 text-sm font-medium {current
		? 'bg-ink text-paper'
		: ''}"
>
	<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
		<path
			d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9Z"
			stroke="currentColor"
			stroke-width="2"
			stroke-linejoin="round"
		/>
		<path d="M10 18.5a2 2 0 0 0 4 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
	</svg>

	<span class="hidden sm:inline">Notifications</span>

	{#if unread > 0}
		<!-- Le nombre est ecrit, pas seulement signale par une pastille de couleur. -->
		<span class="bg-coral text-ink rounded-pill px-2 py-0.5 text-xs font-bold tabular">
			{unread > 99 ? '99+' : unread}
		</span>
		<span class="sr-only">non lue{unread > 1 ? 's' : ''}</span>
	{/if}
</a>
