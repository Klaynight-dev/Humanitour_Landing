<script lang="ts">
	interface Props {
		/** La valeur mise en avant. Toujours un comptage reel, jamais une estimation. */
		value: string;
		label: string;
		/** Precision de lecture : effectif de base, periode, source. */
		hint?: string;
	}

	let { value, label, hint }: Props = $props();
</script>

<!--
	Chiffre d affiche, pas de tableau : il est compose dans la fonte de titrage,
	comme sur les documents imprimes. Les colonnes de chiffres publies, elles,
	restent en chasse fixe (utilitaire `tabular`) pour s aligner.
-->
<div class="flex flex-col gap-1.5">
	<span class="font-display text-4xl leading-none whitespace-nowrap xl:text-5xl">{value}</span>
	<span class="text-base font-semibold">{label}</span>
	{#if hint}
		<!--
			Opacite sur la couleur heritee plutot qu un gris fixe : ce composant sert
			aussi bien sur creme que sur aplat noir, et un `text-muted` fige tomberait
			a 2,6:1 sur noir. A 75 %, le pire des deux cas reste au-dessus de 9:1.
		-->
		<span class="text-sm leading-snug opacity-75">{hint}</span>
	{/if}
</div>
