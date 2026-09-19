<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		message?: string | null;
		children?: Snippet;
	}

	let { message, children }: Props = $props();
</script>

<!--
	Retour d'action de formulaire, factorise : les six pages du back-office
	repetaient le meme `{#if form?.message}` avec la meme classe `panel`. Un
	`children` optionnel accueille le complement propre a une page (ex. le lien
	d invitation affiche une seule fois sur /admin/equipe).
-->
{#if message}
	<div class="panel mb-5 px-4 py-3" role="status">
		<p class="text-sm">{message}</p>
		{@render children?.()}
	</div>
{/if}
