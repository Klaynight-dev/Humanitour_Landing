import type { Component } from 'svelte';
import type { CrosstabResult, DistributionResult } from '$lib/server/survey/aggregate';
import CrosstabTable from './CrosstabTable.svelte';
import {
	barsOption,
	donutOption,
	groupedOption,
	heatmapOption,
	stackedOption,
	type BuiltChart,
	type ChartContext
} from './echarts/options';

/**
 * Registre des visualisations.
 *
 * Ajouter une visualisation = ajouter un constructeur d options et une entree
 * dans `REGISTERED`. Aucun `switch` ailleurs : la page choisit par cle.
 *
 * Le moteur est ECharts, le meme que `forms.humanitour.fr`. Un graphique n est
 * donc plus un composant Svelte mais une FONCTION PURE qui rend un objet
 * d options : elle se teste, ce qu un composant ne faisait pas, et elle se rend
 * indifferemment sur le serveur (en SVG, pour que les chiffres soient du texte
 * indexable) ou dans le navigateur (pour les infobulles).
 *
 * Le tableau croise reste un vrai tableau HTML : ce n est pas un graphique, et
 * le faire dessiner par ECharts lui ferait perdre ses en-tetes de colonnes et
 * sa navigation au clavier.
 */

export type ChartShape = 'distribution' | 'crosstab';

export type ChartRender =
	| {
			readonly kind: 'echarts';
			// La forme des donnees est garantie par `shape` ; le typage precis vit
			// dans chaque constructeur.
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			readonly build: (data: any, context: ChartContext) => BuiltChart;
	  }
	| {
			readonly kind: 'component';
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			readonly component: Component<any>;
	  };

export interface ChartDef {
	/** Valeur stockee dans `SurveyCard.chart`. Contrat : jamais renommee. */
	readonly key: string;
	readonly label: string;
	readonly description: string;
	readonly shape: ChartShape;

	/**
	 * Cette visualisation EST deja un tableau de chiffres.
	 *
	 * Chaque graphique est accompagne d un tableau : la palette porte un
	 * avertissement de contraste, et la compensation retenue est que la couleur
	 * ne soit jamais seule a porter l information (`palette.ts`). Doubler le
	 * tableau croise par un second tableau identique n aiderait personne.
	 */
	readonly tabular: boolean;

	readonly render: ChartRender;
}

const REGISTERED: readonly ChartDef[] = [
	{
		key: 'bars',
		label: 'Barres',
		description: "Répartition d'une question, une barre par modalité.",
		shape: 'distribution',
		tabular: false,
		render: { kind: 'echarts', build: barsOption }
	},
	{
		key: 'donut',
		label: 'Anneau',
		description: "Répartition d'une question en parts d'un tout.",
		shape: 'distribution',
		tabular: false,
		render: { kind: 'echarts', build: donutOption }
	},
	{
		key: 'stacked',
		label: 'Barres empilées',
		description: 'Croisement de deux questions, chaque barre valant 100 % de sa ligne.',
		shape: 'crosstab',
		tabular: false,
		render: { kind: 'echarts', build: stackedOption }
	},
	{
		key: 'grouped',
		label: 'Barres groupées',
		description: 'Croisement de deux questions, les modalités côte à côte sur un axe commun.',
		shape: 'crosstab',
		tabular: false,
		render: { kind: 'echarts', build: groupedOption }
	},
	{
		key: 'heatmap',
		label: 'Carte de chaleur',
		description: "Croisement de deux questions, l'intensité de chaque case valant sa valeur.",
		shape: 'crosstab',
		tabular: false,
		render: { kind: 'echarts', build: heatmapOption }
	},
	{
		key: 'crosstab',
		label: 'Tableau croisé',
		description: 'Croisement de deux questions, effectifs et parts en cellules.',
		shape: 'crosstab',
		tabular: true,
		render: { kind: 'component', component: CrosstabTable }
	}
];

export const CHARTS = REGISTERED;

export function getChart(key: string): ChartDef | null {
	return REGISTERED.find((chart) => chart.key === key) ?? null;
}

/** Visualisations capables d afficher la forme demandee. */
export function chartsFor(shape: ChartShape): readonly ChartDef[] {
	return REGISTERED.filter((chart) => chart.shape === shape);
}

/**
 * Visualisation a utiliser, avec repli.
 *
 * Une carte enregistree avec une visualisation retiree depuis retombe sur la
 * premiere compatible au lieu de casser la page : le contenu publie survit a un
 * changement d outillage.
 */
export function resolveChart(key: string, shape: ChartShape): ChartDef {
	const requested = getChart(key);
	if (requested && requested.shape === shape) return requested;

	const fallback = chartsFor(shape)[0];
	if (!fallback) throw new Error(`Aucune visualisation pour la forme « ${shape} ».`);
	return fallback;
}

/**
 * Construit les options d un graphique, ou rien si la visualisation est un
 * composant.
 *
 * Point de passage unique du rendu serveur et de la reprise cote client : les
 * deux partent du MEME objet d options, donc le graphique ne peut pas changer
 * d allure entre l affichage initial et l arrivee du JavaScript.
 */
export function buildChart(
	chart: ChartDef,
	data: DistributionResult | CrosstabResult,
	context: ChartContext
): BuiltChart | null {
	if (chart.render.kind !== 'echarts') return null;
	return chart.render.build(data, context);
}

export type { BuiltChart, ChartContext, ChartOption } from './echarts/options';
export * from './palette';
