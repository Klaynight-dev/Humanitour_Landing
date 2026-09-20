<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		open: boolean;
		title: string;
		onClose: () => void;
		children: Snippet;
		footer?: Snippet;
	}

	let { open, title, onClose, children, footer }: Props = $props();
	let dialogEl: HTMLDialogElement | undefined = $state();

	/**
	 * `<dialog>` natif plutot qu un overlay maison : focus-trap, fermeture sur
	 * Echap et `::backdrop` viennent du navigateur, sans une ligne de JS.
	 *
	 * `m-auto` n est pas decoratif et ne s enleve pas : c est LUI qui centre la
	 * boite. La feuille du navigateur centre un dialogue modal par `margin:
	 * auto`, et la reinitialisation de Tailwind remet la marge de tout element a
	 * zero — le dialogue se collait donc en haut a gauche de l ecran.
	 */
	$effect(() => {
		if (!dialogEl) return;
		if (open && !dialogEl.open) dialogEl.showModal();
		if (!open && dialogEl.open) dialogEl.close();
	});
</script>

<dialog
	bind:this={dialogEl}
	onclose={onClose}
	onclick={(event) => {
		if (event.target === dialogEl) onClose();
	}}
	class="rounded-panel border-ink/12 bg-paper m-auto w-full max-w-md border p-0 backdrop:bg-black/40"
>
	<div class="p-5">
		<h2 class="text-base font-semibold">{title}</h2>
		<div class="mt-3 text-sm">{@render children()}</div>
		{#if footer}
			<div class="border-ink/12 mt-5 flex justify-end gap-2 border-t pt-4">
				{@render footer()}
			</div>
		{/if}
	</div>
</dialog>
