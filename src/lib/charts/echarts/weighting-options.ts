import { formatCount, formatDecimal, formatShare } from '$shared/format';
import { CATEGORICAL } from '../palette';
import type { BuiltChart } from './options';
import {
	categoryAxis,
	chartBase,
	CHART_FONTS,
	CHART_INK,
	CHART_MUTED,
	endLabel,
	valueAxis
} from './theme';

/**
 * Graphiques du redressement, pour le back-office.
 *
 * Memes regles que `options.ts` : fonctions pures, options serialisables,
 * chiffres composes par `shared/format.ts` et jamais par un gabarit d ECharts.
 * Chaque graphique est accompagne d un tableau dans la page : la couleur ne
 * porte jamais seule l information (`palette.ts`).
 *
 * LES COULEURS SUIVENT LE ROLE, pas le rang. L echantillon brut est toujours
 * bleu, le redresse toujours corail (la couleur de la marque, parce que c est
 * le resultat de l ecran), la cible toujours un trait d encre : une cible n est
 * pas une serie de plus, c est la ligne d arrivee.
 */

/** Bleu : l echantillon tel qu il a ete collecte. Deuxieme slot de la palette validee. */
export const RAW_COLOR = CATEGORICAL[1]!;
/** Corail : l echantillon apres calage. Premier slot, adjacent au bleu dans la validation. */
export const WEIGHTED_COLOR = CATEGORICAL[0]!;

const ROW_HEIGHT = 46;

function legend() {
	return {
		bottom: 0,
		left: 0,
		icon: 'roundRect',
		itemWidth: 12,
		itemHeight: 12,
		textStyle: { color: CHART_INK, fontFamily: CHART_FONTS.sans, fontSize: 12 }
	};
}

/** Une ligne de marge : ce qu on avait, ce qu on a obtenu, ce qu on visait. */
export interface MarginChartRow {
	readonly label: string;
	readonly observed: number | null;
	readonly weighted: number | null;
	readonly target: number | null;
}

function percent(share: number | null): number | null {
	return share === null ? null : Number((share * 100).toFixed(2));
}

/**
 * Marges brute, redressee et cible d une variable de calage.
 *
 * Barres groupees pour le brut et le redresse ; la cible est un trait vertical
 * pose a travers les deux barres. On lit d un coup d oeil si le corail touche
 * le trait, ce que trois barres cote a cote obligeraient a mesurer.
 */
export function marginComparisonOption(rows: readonly MarginChartRow[]): BuiltChart {
	const ordered = [...rows].reverse();

	return {
		height: Math.max(180, 70 + rows.length * ROW_HEIGHT),
		option: {
			...chartBase(),
			tooltip: { ...chartBase().tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
			legend: legend(),
			grid: { left: 8, right: 24, top: 8, bottom: 40, containLabel: true },
			xAxis: valueAxis({ percent: true }),
			yAxis: categoryAxis(ordered.map((row) => row.label)),
			series: [
				{
					name: 'Échantillon brut',
					type: 'bar',
					barWidth: 12,
					barGap: '25%',
					itemStyle: { color: RAW_COLOR, borderRadius: [0, 4, 4, 0] },
					data: ordered.map((row) => ({
						value: percent(row.observed),
						tooltip: { formatter: `${row.label} : ${formatShare(row.observed)} (brut)` }
					}))
				},
				{
					name: 'Redressé',
					type: 'bar',
					barWidth: 12,
					itemStyle: { color: WEIGHTED_COLOR, borderRadius: [0, 4, 4, 0] },
					data: ordered.map((row) => ({
						value: percent(row.weighted),
						tooltip: { formatter: `${row.label} : ${formatShare(row.weighted)} (redressé)` }
					}))
				},
				{
					name: 'Cible',
					type: 'scatter',
					symbol: 'rect',
					symbolSize: [3, 30],
					itemStyle: { color: CHART_INK },
					z: 3,
					data: ordered.map((row) => ({
						value: percent(row.target),
						tooltip: { formatter: `${row.label} : cible ${formatShare(row.target)}` }
					}))
				}
			]
		}
	};
}

/** Une modalite de la variable d interet, avant et apres redressement. */
export interface ImpactChartRow {
	readonly label: string;
	readonly raw: number | null;
	readonly weighted: number | null;
}

/**
 * Ce que le redressement change a une question d interet.
 *
 * Deux series seulement : le lecteur compare une barre a sa voisine, chaque
 * barre portant sa part en toutes lettres.
 */
export function impactOption(rows: readonly ImpactChartRow[]): BuiltChart {
	const ordered = [...rows].reverse();

	const serie = (name: string, color: string, pick: (row: ImpactChartRow) => number | null) => ({
		name,
		type: 'bar',
		barWidth: 12,
		barGap: '25%',
		itemStyle: { color, borderRadius: [0, 4, 4, 0] },
		label: { ...endLabel(), fontSize: 11 },
		data: ordered.map((row) => ({
			value: percent(pick(row)),
			label: { formatter: formatShare(pick(row)) },
			tooltip: { formatter: `${row.label} : ${formatShare(pick(row))} (${name.toLowerCase()})` }
		}))
	});

	return {
		height: Math.max(180, 70 + rows.length * ROW_HEIGHT),
		option: {
			...chartBase(),
			legend: legend(),
			grid: { left: 8, right: 64, top: 8, bottom: 40, containLabel: true },
			xAxis: valueAxis({ percent: true }),
			yAxis: categoryAxis(ordered.map((row) => row.label)),
			series: [
				serie('Brut', RAW_COLOR, (row) => row.raw),
				serie('Redressé', WEIGHTED_COLOR, (row) => row.weighted)
			]
		}
	};
}

/** Une classe de l histogramme des poids. */
export interface HistogramChartBin {
	readonly from: number;
	readonly to: number;
	readonly count: number;
}

export function binLabel(bin: HistogramChartBin): string {
	return `${formatDecimal(bin.from)} à ${formatDecimal(bin.to)}`;
}

/**
 * Distribution des poids.
 *
 * Une seule serie : le titre de la page la nomme, pas de legende. Une masse
 * collee a gauche ou a droite dit que la troncature travaille beaucoup.
 */
export function weightHistogramOption(bins: readonly HistogramChartBin[]): BuiltChart {
	return {
		height: 240,
		option: {
			...chartBase(),
			grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
			xAxis: {
				...categoryAxis(bins.map(binLabel)),
				axisLabel: {
					color: CHART_MUTED,
					fontFamily: CHART_FONTS.mono,
					fontSize: 10,
					rotate: 35,
					interval: 0
				}
			},
			yAxis: valueAxis(),
			series: [
				{
					type: 'bar',
					barCategoryGap: '8%',
					itemStyle: { color: WEIGHTED_COLOR, borderRadius: [4, 4, 0, 0] },
					data: bins.map((bin) => ({
						value: bin.count,
						tooltip: {
							formatter: `Poids de ${binLabel(bin)} : ${formatCount(bin.count)} répondant${bin.count > 1 ? 's' : ''}`
						}
					}))
				}
			]
		}
	};
}

/** Une iteration du calage : l ecart maximal restant, en part. */
export interface ConvergenceChartStep {
	readonly iteration: number;
	readonly maxDeviation: number;
}

/**
 * Plancher d affichage de l echelle logarithmique.
 *
 * Un ecart exactement nul (echantillon deja conforme) n a pas de logarithme :
 * il est pose au plancher, et le tableau donne la vraie valeur.
 */
const LOG_FLOOR = 1e-7;

/**
 * Trace de convergence : l ecart maximal aux cibles, iteration par iteration.
 *
 * Echelle logarithmique, parce que le raking converge geometriquement : en
 * echelle lineaire, tout se passerait dans les deux premieres iterations et le
 * reste serait une ligne plate. Les graduations ne sont pas ecrites (ECharts
 * les ecrirait a l anglaise) : la premiere et la derniere valeur, et le seuil,
 * sont etiquetes directement, et le tableau donne toutes les autres.
 */
export function convergenceOption(
	history: readonly ConvergenceChartStep[],
	tolerance: number
): BuiltChart {
	const last = history.length - 1;
	const toPoints = (share: number) => Math.max(share * 100, LOG_FLOOR);

	return {
		height: 240,
		option: {
			...chartBase(),
			tooltip: { ...chartBase().tooltip, trigger: 'item' },
			grid: { left: 8, right: 120, top: 24, bottom: 8, containLabel: true },
			xAxis: {
				type: 'category',
				data: history.map((step) => String(step.iteration)),
				axisLine: { lineStyle: { color: '#dcd8d6' } },
				axisTick: { show: false },
				axisLabel: { color: CHART_MUTED, fontFamily: CHART_FONTS.mono, fontSize: 11 },
				name: 'itération',
				nameLocation: 'end',
				nameTextStyle: { color: CHART_MUTED, fontSize: 11 }
			},
			yAxis: {
				type: 'log',
				logBase: 10,
				axisLine: { show: false },
				axisLabel: { show: false },
				splitLine: { lineStyle: { color: '#dcd8d6' } }
			},
			series: [
				{
					type: 'line',
					lineStyle: { width: 2, color: WEIGHTED_COLOR },
					itemStyle: { color: WEIGHTED_COLOR },
					symbol: 'circle',
					symbolSize: 8,
					data: history.map((step, index) => ({
						value: toPoints(step.maxDeviation),
						label:
							index === 0 || index === last
								? {
										show: true,
										position: 'top',
										color: CHART_INK,
										fontFamily: CHART_FONTS.mono,
										fontSize: 11,
										formatter: `${formatDecimal(step.maxDeviation * 100, 4)} pt`
									}
								: { show: false },
						tooltip: {
							formatter: `Itération ${step.iteration} : écart maximal ${formatDecimal(step.maxDeviation * 100, 4)} pt`
						}
					})),
					markLine: {
						silent: true,
						symbol: 'none',
						lineStyle: { color: CHART_INK, type: 'dashed', width: 1 },
						label: {
							color: CHART_INK,
							fontFamily: CHART_FONTS.sans,
							fontSize: 11,
							formatter: `seuil ε : ${formatDecimal(tolerance * 100, 4)} pt`
						},
						data: [{ yAxis: toPoints(tolerance) }]
					}
				}
			]
		}
	};
}

/** Le tableau qui accompagne l histogramme : memes classes, memes effectifs. */
export function histogramRows(bins: readonly HistogramChartBin[], total: number) {
	return bins.map((bin) => ({
		label: binLabel(bin),
		count: bin.count,
		share: total > 0 ? bin.count / total : null
	}));
}
