<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		/** Compteur affiche a droite du titre, quand il ajoute quelque chose. */
		badge?: string;
		/** Lien de bas de carte : « Ouvrir le journal ». */
		href?: string;
		linkLabel?: string;
		/** Ce qui s'affiche quand la liste est vide, en une phrase. */
		empty?: string;
		rows: number;
		children: Snippet;
	}

	let { title, badge, href, linkLabel, empty, rows, children }: Props = $props();
</script>

<!--
	Une carte de liste serree.

	Le tableau de bord en aligne plusieurs, cote a cote : l'entete est donc plus
	basse que celle de `Panel`, les lignes n'ont pas de marge interieure verticale
	superflue, et le tout tient sans faire defiler. C'est le point de la demande
	— voir beaucoup d'un coup — et c'est ce qui distingue cette carte de `Panel`,
	qui reste la surface des ecrans de saisie.
-->
<section class="panel flex flex-col overflow-hidden">
	<header class="border-ink/12 flex items-baseline justify-between gap-2 border-b px-4 py-2.5">
		<h2 class="text-sm font-semibold tracking-wide uppercase">{title}</h2>
		{#if badge}<span class="text-muted text-xs font-semibold">{badge}</span>{/if}
	</header>

	{#if rows === 0}
		<p class="text-muted px-4 py-4 text-sm">{empty ?? 'Rien à afficher.'}</p>
	{:else}
		<ul class="divide-ink/10 flex-1 divide-y">
			{@render children()}
		</ul>
	{/if}

	{#if href && linkLabel}
		<footer class="border-ink/12 bg-cream border-t px-4 py-2">
			<a href={href} class="text-coral-ink text-sm underline">{linkLabel}</a>
		</footer>
	{/if}
</section>
