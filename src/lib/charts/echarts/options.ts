import type { CrosstabResult, DistributionResult } from '$lib/server/survey/aggregate';
import { SUPPRESSED_LABEL } from '$shared/format';
import { colorFor, SUPPRESSED_COLOR } from '../palette';
import { categoryAxis, chartBase, CHART_MUTED, endLabel, valueAxis } from './theme';

/**
 * Constructeurs d options ECharts.
 *
 * Des fonctions PURES : une donnee agregee entre, un objet d options sort.
 * C est ce qui permet de les tester, alors que les composants de graphiques ne
 * l etaient pas (AGENTS.md section 3.2 : si une logique est difficile a
 * tester, elle est au mauvais endroit).
 *
 * Contrainte a respecter dans tout ce fichier : l objet produit doit rester
 * SERIALISABLE en JSON. Il est calcule sur le serveur, rendu en SVG la-bas,
 * puis renvoye tel quel au navigateur qui reprend la main dessus. Une fonction
 * de formatage ne traverserait pas : on n emploie que des gabarits en chaine,
 * du type « {b} : {c} % ».
 */

/** Un objet d options ECharts, volontairement non type finement. */
export type ChartOption = Record<string, unknown>;

export interface ChartContext {
	/** Libelle exact de la question, affiche avec le graphique. */
	readonly question: string;
	/** Libelle de la question croisee, pour les formes a deux axes. */
	readonly crossedWith?: string;
	/**
	 * Emplacement de couleur par cle de modalite, fige sur l ordre declare.
	 * Sans lui, trier par effectif repeindrait le graphique (`palette.ts`).
	 */
	readonly colorSlots: Readonly<Record<string, number>>;
}

export interface BuiltChart {
	readonly option: ChartOption;
	/** Hauteur en pixels : le rendu serveur exige une taille explicite. */
	readonly height: number;
}

/** Part en pourcentage a une decimale, la precision publiee partout ailleurs. */
function percent(share: number | null): number {
	return Number(((share ?? 0) * 100).toFixed(1));
}

function colorOf(
	context: ChartContext,
	modality: { key: string; isNonResponse: boolean; color?: string | null }
): string {
	return colorFor(context.colorSlots[modality.key] ?? 0, {
		isNonResponse: modality.isNonResponse,
		override: modality.color
	});
}

/**
 * Hauteur d un graphique a barres horizontales.
 *
 * Elle suit le NOMBRE de modalites : une hauteur fixe ecraserait une question a
 * douze modalites en une grille illisible, et etirerait une question binaire
 * sur tout l ecran.
 */
function barsHeight(count: number): number {
	return Math.max(160, 40 + count * 38);
}

/** Repartition d une question, une barre par modalite, etiquetee au bout. */
export function barsOption(result: DistributionResult, context: ChartContext): BuiltChart {
	// L axe des categories se lit de haut en bas : ECharts empile depuis le bas,
	// on inverse donc pour que la premiere modalite soit en haut.
	const bars = [...result.bars].reverse();

	return {
		height: barsHeight(result.bars.length),
		option: {
			...chartBase(),
			grid: { left: 8, right: 64, top: 8, bottom: 8, containLabel: true },
			xAxis: valueAxis({ percent: true }),
			yAxis: categoryAxis(bars.map((bar) => bar.label)),
			series: [
				{
					type: 'bar',
					barMaxWidth: 26,
					label: endLabel(),
					data: bars.map((bar) => ({
						value: percent(bar.share),
						itemStyle: {
							color: bar.suppressed ? SUPPRESSED_COLOR : colorOf(context, bar),
							borderRadius: [0, 4, 4, 0]
						},
						// Une case masquee ne montre pas un zero : elle dit pourquoi elle
						// est vide, sinon on lirait « personne n a choisi cette reponse ».
						label: bar.suppressed
							? { formatter: SUPPRESSED_LABEL, color: CHART_MUTED, fontWeight: 400 }
							: undefined,
						tooltip: {
							formatter: bar.suppressed
								? `${bar.label} : ${SUPPRESSED_LABEL}`
								: `${bar.label}<br/><b>{c} %</b> (${bar.count ?? 0} répondants)`
						}
					}))
				}
			]
		}
	};
}

/** Repartition en parts d un tout. Le centre porte la base, pas un logo. */
export function donutOption(result: DistributionResult, context: ChartContext): BuiltChart {
	const slices = result.bars.filter((bar) => !bar.suppressed);

	return {
		height: 320,
		option: {
			...chartBase(),
			series: [
				{
					type: 'pie',
					radius: ['48%', '76%'],
					center: ['50%', '50%'],
					// Trier ici casserait l ordre deja decide en amont (declare ou par
					// effectif) : le graphique affiche ce qu on lui donne.
					avoidLabelOverlap: true,
					itemStyle: { borderColor: '#ffffff', borderWidth: 2 },
					label: {
						formatter: '{b}\n{c} %',
						fontSize: 12,
						lineHeight: 16,
						color: '#000000'
					},
					labelLine: { length: 12, length2: 10 },
					data: slices.map((bar) => ({
						name: bar.label,
						value: percent(bar.share),
						itemStyle: { color: colorOf(context, bar) },
						tooltip: { formatter: `${bar.label}<br/><b>{c} %</b> (${bar.count ?? 0} répondants)` }
					}))
				}
			]
		}
	};
}

/** Les modalites croisees, dans l ordre ou elles doivent garder leur couleur. */
function crossSeries(
	table: CrosstabResult,
	context: ChartContext,
	stacked: boolean
): readonly ChartOption[] {
	const rows = [...table.xModalities].reverse();

	return table.yModalities.map((yModality) => ({
		name: yModality.label,
		type: 'bar',
		stack: stacked ? 'total' : undefined,
		barMaxWidth: stacked ? 30 : 14,
		itemStyle: {
			color: colorOf(context, yModality)
		},
		data: rows.map((xModality) => {
			const cell = table.cells.get(xModality.key)?.get(yModality.key);
			return {
				value: cell?.suppressed ? 0 : percent(cell?.share ?? null),
				itemStyle: cell?.suppressed ? { color: SUPPRESSED_COLOR } : undefined,
				tooltip: {
					formatter: cell?.suppressed
						? `${xModality.label} / ${yModality.label} : ${SUPPRESSED_LABEL}`
						: `${xModality.label}<br/>${yModality.label} : <b>{c} %</b> (${cell?.count ?? 0})`
				}
			};
		})
	}));
}

function crossLegend(): ChartOption {
	return {
		type: 'scroll',
		bottom: 0,
		icon: 'roundRect',
		itemWidth: 12,
		itemHeight: 12,
		textStyle: { fontSize: 12, color: '#000000' }
	};
}

/** Croisement empile : chaque ligne vaut 100 % d elle-meme. */
export function stackedOption(table: CrosstabResult, context: ChartContext): BuiltChart {
	return {
		height: Math.max(220, 80 + table.xModalities.length * 44),
		option: {
			...chartBase(),
			legend: crossLegend(),
			grid: { left: 8, right: 16, top: 8, bottom: 44, containLabel: true },
			xAxis: valueAxis({ max: 100, percent: true }),
			yAxis: categoryAxis([...table.xModalities].reverse().map((modality) => modality.label)),
			series: crossSeries(table, context, true)
		}
	};
}

/**
 * Croisement en barres groupees.
 *
 * Cote a cote plutot qu empilees : au-dela de deux modalites croisees, une pile
 * ne permet plus de comparer autre chose que le premier segment, tous les
 * autres commencant a une hauteur differente.
 */
export function groupedOption(table: CrosstabResult, context: ChartContext): BuiltChart {
	const rows = table.xModalities.length;
	const series = table.yModalities.length;

	return {
		height: Math.max(240, 80 + rows * Math.max(48, series * 18)),
		option: {
			...chartBase(),
			legend: crossLegend(),
			grid: { left: 8, right: 48, top: 8, bottom: 44, containLabel: true },
			xAxis: valueAxis({ percent: true }),
			yAxis: categoryAxis([...table.xModalities].reverse().map((modality) => modality.label)),
			series: crossSeries(table, context, false)
		}
	};
}
