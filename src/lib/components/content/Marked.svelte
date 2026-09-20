<script lang="ts">
	interface Props {
		text: string;
		/** Le mot du titre qui recoit l'etiquette. Absent du titre : rien ne change. */
		highlight?: string | null;
		style?: string;
	}

	let { text, highlight = null, style = 'brand' }: Props = $props();

	/**
	 * Le titre decoupe autour du mot mis en avant.
	 *
	 * Le back-office saisit le titre en clair et le mot separement, jamais du
	 * balisage : le modele de contenu n'accepte aucune balise, c'est ce qui
	 * interdit a un compte compromis d'en poser une sur le site public. Le
	 * decoupage se fait donc ici, a l'affichage.
	 *
	 * Premiere occurrence seulement : l'etiquette de la charte est un accent,
	 * et trois accents dans un titre n'accentuent plus rien.
	 */
	const parts = $derived.by(() => {
		const needle = highlight?.trim() ?? '';
		if (needle === '') return { before: text, marked: null, after: '' };

		const at = text.indexOf(needle);
		if (at === -1) return { before: text, marked: null, after: '' };

		return {
			before: text.slice(0, at),
			marked: needle,
			after: text.slice(at + needle.length)
		};
	});

	/* `mark-ink` sur les surfaces de marque : une etiquette au degrade posee sur
	   un degrade disparaitrait dans son fond. */
	const markClass = $derived(style === 'ink' ? 'mark-ink' : 'mark-brand');
</script>

{parts.before}{#if parts.marked}<span class={markClass}>{parts.marked}</span>{/if}{parts.after}
