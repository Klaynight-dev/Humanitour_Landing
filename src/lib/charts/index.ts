import type { Component } from 'svelte';
import BarChart from './BarChart.svelte';
import CrosstabTable from './CrosstabTable.svelte';
import DonutChart from './DonutChart.svelte';
import StackedBarChart from './StackedBarChart.svelte';

/**
 * Registre des visualisations.
 *
 * Ajouter une visualisation = ajouter un composant et une entree dans
 * `REGISTERED`. Aucun `switch` ailleurs : la page de donnees choisit par cle.
 */

/**
 * Forme de donnees attendue.
 *
 * `distribution` n a qu un axe, `crosstab` en a deux. C est ce qui determine si
 * une visualisation peut repondre a la demande de l utilisateur, pas une liste
 * de cas particuliers dans la page.
 */
export type ChartShape = 'distribution' | 'crosstab';

export interface ChartDef {
	/** Valeur stockee dans `SurveyCard.chart`. Contrat : jamais renommee. */
	readonly key: string;
	readonly label: string;
	readonly description: string;
	readonly shape: ChartShape;
	// Le composant accepte la forme de donnees correspondante ; le typage precis
	// vit dans chaque composant, le registre ne manipule que la cle et la forme.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	readonly component: Component<any>;
}

const REGISTERED: readonly ChartDef[] = [
	{
		key: 'bars',
		label: 'Barres',
		description: "Répartition d'une question, une barre par modalité.",
		shape: 'distribution',
		component: BarChart
	},
	{
		key: 'donut',
		label: 'Anneau',
		description: "Répartition d'une question en parts d'un tout.",
		shape: 'distribution',
		component: DonutChart
	},
	{
		key: 'stacked',
		label: 'Barres empilées',
		description: 'Croisement de deux questions, chaque barre valant 100 % de sa ligne.',
		shape: 'crosstab',
		component: StackedBarChart
	},
	{
		key: 'crosstab',
		label: 'Tableau croisé',
		description: 'Croisement de deux questions, effectifs et parts en cellules.',
		shape: 'crosstab',
		component: CrosstabTable
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

export * from './palette';
