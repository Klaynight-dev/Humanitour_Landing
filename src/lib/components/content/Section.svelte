<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SpacingKey, SurfaceKey } from '$lib/shared/content/blocks/common';
	import { borderClass, CONTAINER, SPACING_CLASS, SURFACE_CLASS } from './surfaces';

	interface Props {
		surface: SurfaceKey;
		spacing: SpacingKey;
		/** Les deux aplats organiques de la charte, dans les marges. */
		shapes?: boolean;
		labelledby?: string;
		label?: string;
		/** Ce qui se pose derriere le contenu : un dégradé animé, par exemple. */
		backdrop?: Snippet;
		children: Snippet;
	}

	let {
		surface,
		spacing,
		shapes = false,
		labelledby,
		label,
		backdrop,
		children
	}: Props = $props();
</script>

<!--
	L'enveloppe commune a toutes les sections.

	Elle porte la surface, la respiration et la colonne de texte — les trois
	choses qui doivent etre identiques d'une section a l'autre pour que la page
	se lise comme une page et non comme un empilement de blocs.

	Les aplats organiques sont poses ici et nulle part ailleurs : ils sont
	toujours les memes, aux memes deux coins, dans les marges et jamais sous le
	texte (`app.css`). Les laisser regler section par section reviendrait a
	laisser defaire la regle.
-->
<section
	class="relative isolate overflow-hidden {SURFACE_CLASS[surface]}"
	aria-labelledby={labelledby}
	aria-label={label}
>
	{#if shapes}
		<div class="shape-field" aria-hidden="true">
			<span class="shape shape-coral"></span>
			<span class="shape shape-pink"></span>
		</div>
	{/if}

	{@render backdrop?.()}

	<!--
		« Enchaîne la section précédente » : pas de marge haute, et un filet a la
		jointure. C'est ce qui fait lire deux bandes de meme fond comme un seul
		bloc, au lieu d'une bande qui recommence.
	-->
	<div
		class="relative {CONTAINER} {SPACING_CLASS[spacing]} {spacing === 'suite'
			? `border-t ${borderClass(surface)}`
			: ''}"
	>
		{@render children()}
	</div>
</section>
