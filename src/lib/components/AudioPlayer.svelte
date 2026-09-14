<script lang="ts">
	import { formatDuration } from '$lib/shared/media';

	interface Props {
		src: string;
		title: string;
		durationSeconds?: number | null;
	}

	let { src, title, durationSeconds = null }: Props = $props();
</script>

<!-- Lecteur natif du navigateur : pas d'integration tierce, donc aucun traceur
     chez la personne qui ecoute. -->
<div class="brut bg-surface rounded-card p-5">
	<div class="flex flex-wrap items-baseline justify-between gap-2">
		<p class="font-display font-semibold">{title}</p>
		{#if durationSeconds}
			<span class="text-muted tabular text-sm">{formatDuration(durationSeconds)}</span>
		{/if}
	</div>
	<audio controls preload="metadata" class="mt-4 w-full" {src}>
		<track kind="captions" />
		Votre navigateur ne sait pas lire cet audio.
		<a href={src} download>Télécharger l'épisode</a>
	</audio>
</div>
