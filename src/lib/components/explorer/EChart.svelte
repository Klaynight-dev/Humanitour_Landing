<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type * as EChartsApi from 'echarts';
	import type { ECharts } from 'echarts';
	import type { ChartOption } from '$charts';

	/**
	 * Un graphique ECharts, rendu deux fois et sans jamais changer d allure.
	 *
	 * 1. Le serveur a deja produit le SVG, qui s affiche immediatement : les
	 *    libelles et les chiffres sont du texte, presents sans JavaScript et
	 *    lisibles par un moteur de recherche comme par un lecteur d ecran.
	 * 2. Au montage, ECharts est charge et reprend la main sur le MEME objet
	 *    d options. On y gagne les infobulles et le redimensionnement, on n y
	 *    perd rien, puisque le dessin part de la meme description.
	 *
	 * ECharts est importe DYNAMIQUEMENT, comme dans Openforms : c est une grosse
	 * dependance, et elle n a aucune raison de peser sur le premier chargement
	 * d une page que beaucoup de visiteurs se contenteront de lire.
	 */
	interface Props {
		/** Le SVG rendu par le serveur, affiche jusqu a la reprise. */
		svg: string;
		option: ChartOption;
		height: number;
		/** Description du graphique pour qui ne le voit pas. */
		label: string;
	}

	let { svg, option, height, label }: Props = $props();

	let host: HTMLDivElement | null = $state(null);
	let chart: ECharts | null = null;
	let ready = $state(false);

	/**
	 * Le module, garde apres son chargement.
	 *
	 * L export d image en a besoin, et le recharger ouvrirait la porte a deux
	 * versions d ECharts dans la meme page.
	 */
	let engine: typeof EChartsApi | null = null;

	/**
	 * Largeur de rendu de l affiche exportee.
	 *
	 * Exactement la largeur que le graphique occupera dans l image finale
	 * (`poster.ts`), pour que le corps du texte y soit celui prevu et non une
	 * mise a l echelle approximative.
	 */
	const EXPORT_WIDTH = 1088;

	/**
	 * Le graphique en PNG, pour l affiche.
	 *
	 * Rendu dans une instance CANVAS hors ecran plutot que depuis celle qui est
	 * affichee : en mode SVG, `getDataURL` rend du SVG, que `drawImage` ne sait
	 * pas composer avec les polices de la page.
	 */
	export async function toPng(): Promise<{
		dataUrl: string;
		width: number;
		height: number;
	} | null> {
		if (!engine) return null;

		const holder = document.createElement('div');
		holder.style.cssText = `position:fixed;left:-10000px;top:0;width:${EXPORT_WIDTH}px;height:${height}px;`;
		document.body.append(holder);

		const offscreen = engine.init(holder, null, {
			renderer: 'canvas',
			width: EXPORT_WIDTH,
			height
		});

		try {
			offscreen.setOption(option);
			return {
				dataUrl: offscreen.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' }),
				width: EXPORT_WIDTH,
				height
			};
		} finally {
			offscreen.dispose();
			holder.remove();
		}
	}

	onMount(() => {
		let disposed = false;
		let observer: ResizeObserver | null = null;

		void (async () => {
			const echarts = await import('echarts');
			if (disposed || !host) return;
			engine = echarts;

			// Le SVG du serveur est retire AVANT l initialisation : ECharts ajoute
			// son propre dessin dans le conteneur, et les deux se superposeraient
			// le temps d une image.
			ready = true;
			await tick();
			if (disposed || !host) return;

			chart = echarts.init(host, null, { renderer: 'svg' });
			chart.setOption(option);

			// Le conteneur change de largeur au redimensionnement de la fenetre
			// comme a l ouverture d un panneau : ECharts ne le voit pas seul.
			observer = new ResizeObserver(() => chart?.resize());
			observer.observe(host);
		})();

		return () => {
			disposed = true;
			observer?.disconnect();
			chart?.dispose();
			chart = null;
		};
	});

	/**
	 * Un changement de donnees remplace les options sans reconstruire le
	 * graphique.
	 *
	 * LES DEUX DEPENDANCES SONT LUES EN PREMIER, avant toute sortie anticipee.
	 * Svelte n enregistre que ce que l effet a REELLEMENT lu pendant son
	 * execution : au premier passage, l instance n existe pas encore, un
	 * `if (!chart) return` place avant la lecture sortait sans jamais toucher
	 * `option`, elle n entrait donc pas dans les dependances, et le graphique
	 * restait fige sur son premier rendu pendant que le reste de la page se
	 * mettait a jour.
	 *
	 * `notMerge` : sans lui, une serie retiree resterait a l ecran, et passer
	 * des barres a l anneau laisserait les axes derriere.
	 */
	$effect(() => {
		const nextOption = option;
		const nextHeight = height;

		if (!chart || !ready) return;

		chart.setOption(nextOption, { notMerge: true });
		// La hauteur suit le nombre de modalites : une question a douze reponses
		// n occupe pas la place d une question binaire. ECharts ne relit pas le
		// style de son conteneur tout seul, on lui donne la mesure.
		chart.resize({ height: nextHeight });
	});
</script>

<!--
	`role="img"` et son libelle : le SVG d ECharts est un dessin, pas une
	structure. Le tableau de chiffres qui accompagne chaque graphique reste la
	lecture de reference (`charts/palette.ts`).
-->
<div
	bind:this={host}
	role="img"
	aria-label={label}
	class="w-full"
	style:height="{height}px"
	style:min-height="{height}px"
>
	{#if !ready}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html svg}
	{/if}
</div>

<style>
	/* Le SVG du serveur porte une largeur fixe : on le laisse suivre son
	   conteneur, son `viewBox` s occupe du reste. */
	div :global(svg) {
		width: 100%;
		height: 100%;
	}
</style>
