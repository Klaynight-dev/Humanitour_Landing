<script lang="ts">
	interface Props {
		/** URL d'integration RECONSTRUITE au moment de l'enregistrement. */
		embedUrl: string;
		title: string;
	}

	let { embedUrl, title }: Props = $props();
</script>

<!-- `sandbox` et `referrerpolicy` limitent ce que la page tierce peut faire et
     apprendre du visiteur. L'URL n'est jamais celle saisie : elle a ete
     reconstruite a partir du seul identifiant valide (shared/media/embed.ts). -->
<div class="rounded-card bg-ink aspect-video w-full overflow-hidden">
	<iframe
		src={embedUrl}
		{title}
		class="h-full w-full"
		loading="lazy"
		referrerpolicy="strict-origin-when-cross-origin"
		sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
		allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
		allowfullscreen
	></iframe>
</div>
