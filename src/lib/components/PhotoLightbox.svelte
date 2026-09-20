<script lang="ts">
	import type { TourPhoto } from '$lib/shared/photos';

	interface Props {
		photo: TourPhoto | null;
		onClose: () => void;
	}

	let { photo, onClose }: Props = $props();
	let dialogEl: HTMLDialogElement | undefined = $state();

	/**
	 * <dialog> natif, meme choix que admin/Dialog.svelte : le piege du focus, la
	 * fermeture sur Echap et le fond ::backdrop viennent du navigateur, sans une
	 * ligne de JS.
	 */
	$effect(() => {
		if (!dialogEl) return;
		if (photo && !dialogEl.open) dialogEl.showModal();
		if (!photo && dialogEl.open) dialogEl.close();
	});
</script>

<!--
	`m-auto` : le reset Tailwind met la marge de tous les elements a zero, ce qui
	ecrase le `margin: auto` que les navigateurs posent sur `dialog:modal` pour le
	centrer. Sans quoi, la visionneuse colle au coin haut-gauche de l'ecran.
-->
<dialog
	bind:this={dialogEl}
	onclose={onClose}
	onclick={(event) => {
		if (event.target === dialogEl) onClose();
	}}
	class="m-auto max-h-[90vh] w-[min(92vw,64rem)] border-0 bg-transparent p-0 backdrop:bg-black/85"
>
	{#if photo}
		<figure class="relative">
			<button
				type="button"
				onclick={onClose}
				aria-label="Fermer la photo en grand"
				class="glass-chip text-ink focus-visible:outline-ink absolute top-3 right-3 flex h-11 w-11 items-center justify-center rounded-full transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4"
			>
				<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
					<path
						d="M4 4l12 12M16 4L4 16"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linecap="round"
					/>
				</svg>
			</button>
			<!--
				`photo-block` pose le meme fond d encre que les vignettes : en
				`object-contain`, les cliches portrait laissent des bandes, et ce fond
				les rend intentionnelles plutot que vides.
			-->
			<img
				src={photo.src}
				alt={photo.alt}
				width={photo.width}
				height={photo.height}
				class="photo-block max-h-[80vh] w-full object-contain"
			/>
			<!--
				La legende EST `alt` (voir photos.ts) : une seule phrase ecrite par
				cliche, montree ici et lue par les lecteurs d ecran a l etat de
				vignette.
			-->
			<figcaption class="measure text-paper mx-auto mt-4 text-center text-base leading-relaxed">
				{photo.alt}
			</figcaption>
		</figure>
	{/if}
</dialog>
