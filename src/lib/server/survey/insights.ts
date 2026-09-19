import type { CrosstabResult, DistributionResult } from './aggregate';
import type { ExploreOutcome } from './explore';

/**
 * Constats tires d un resultat.
 *
 * C est l equivalent des « key insights » d Our World in Data : deux ou trois
 * faits places AVANT le graphique, pour que le lecteur sache ce qu il regarde
 * avant d avoir a le dechiffrer.
 *
 * TROIS REGLES, et elles sont ce qui separe ce fichier d un generateur de
 * commentaire automatique :
 *
 *   1. On ne sort que des FAITS CALCULES. « Le pouvoir d achat arrive en tete
 *      avec 31,2 % » est un comptage ; « les Francais s inquietent pour leur
 *      pouvoir d achat » est une interpretation, et personne ici n a mandat
 *      pour l ecrire a la place du lecteur.
 *   2. Une case masquee par le seuil d anonymat n entre dans aucun constat.
 *      Un constat qui dirait « la plus faible valeur est masquee » rendrait par
 *      deduction ce que le masquage protege.
 *   3. Ce fichier ne rend AUCUNE phrase. Il rend des valeurs, et la page les
 *      pose dans des phrases ecrites a la main (AGENTS.md section 5 : le texte
 *      visible s ecrit, il ne se genere pas).
 */

/** La modalite la plus citee, hors non-reponse. */
export interface DominantInsight {
	readonly kind: 'dominant';
	readonly label: string;
	readonly share: number;
	readonly count: number;
	/** Ecart en points avec la modalite suivante. `null` s il n y en a qu une. */
	readonly leadPoints: number | null;
	readonly runnerUpLabel: string | null;
}

/** Le poids de la non-reponse, qui est un resultat et non un manque. */
export interface NonResponseInsight {
	readonly kind: 'non-response';
	readonly share: number;
	readonly count: number;
}

/** Le plus grand ecart d un croisement : la phrase que cherche un journaliste. */
export interface GapInsight {
	readonly kind: 'gap';
	readonly yLabel: string;
	readonly highLabel: string;
	readonly highShare: number;
	readonly lowLabel: string;
	readonly lowShare: number;
	/** Ecart en points de pourcentage, arrondi a l entier. */
	readonly points: number;
}

export type Insight = DominantInsight | NonResponseInsight | GapInsight;

/** Une part publiee, ou rien. Une case masquee ne participe a aucun calcul. */
function published(share: number | null, suppressed: boolean): number | null {
	return suppressed || share === null ? null : share;
}

function dominantOf(result: DistributionResult): DominantInsight | null {
	const ranked = result.bars
		.filter((bar) => !bar.isNonResponse)
		.map((bar) => ({ bar, share: published(bar.share, bar.suppressed) }))
		.filter(
			(entry): entry is { bar: (typeof result.bars)[number]; share: number } => entry.share !== null
		)
		.sort((a, b) => b.share - a.share);

	const first = ranked[0];
	if (!first || first.bar.count === null) return null;

	const second = ranked[1];

	return {
		kind: 'dominant',
		label: first.bar.label,
		share: first.share,
		count: first.bar.count,
		leadPoints: second ? Math.round((first.share - second.share) * 100) : null,
		runnerUpLabel: second?.bar.label ?? null
	};
}

function nonResponseOf(result: DistributionResult): NonResponseInsight | null {
	const bar = result.bars.find((candidate) => candidate.isNonResponse);
	const share = bar ? published(bar.share, bar.suppressed) : null;

	// Zero non-reponse n est pas un constat : c est l absence de constat.
	if (!bar || share === null || bar.count === null || bar.count === 0) return null;

	return { kind: 'non-response', share, count: bar.count };
}

/**
 * Le croisement ou la meme modalite varie le plus d une ligne a l autre.
 *
 * On compare, pour chaque modalite croisee, sa part d une ligne a l autre : la
 * lecture usuelle d un tri croise, et celle que le tableau affiche deja. On
 * retient l ecart le plus large, parce que c est le seul qui apprenne quelque
 * chose : un croisement ou tout se ressemble se lit « rien ne distingue ces
 * groupes », ce que le graphique montre mieux qu une phrase.
 */
function gapOf(table: CrosstabResult): GapInsight | null {
	let best: GapInsight | null = null;

	for (const yModality of table.yModalities) {
		const spread = spreadFor(table, yModality.key);
		if (!spread) continue;

		const points = Math.round((spread.high.share - spread.low.share) * 100);
		if (best && points <= best.points) continue;

		best = {
			kind: 'gap',
			yLabel: yModality.label,
			highLabel: spread.high.label,
			highShare: spread.high.share,
			lowLabel: spread.low.label,
			lowShare: spread.low.share,
			points
		};
	}

	// Un ecart nul ne merite pas une phrase : deux groupes identiques se
	// constatent sur le graphique.
	return best && best.points > 0 ? best : null;
}

interface Extremum {
	readonly label: string;
	readonly share: number;
}

function spreadFor(
	table: CrosstabResult,
	yKey: string
): { readonly high: Extremum; readonly low: Extremum } | null {
	const points: Extremum[] = [];

	for (const xModality of table.xModalities) {
		const cell = table.cells.get(xModality.key)?.get(yKey);
		const share = cell ? published(cell.share, cell.suppressed) : null;
		if (share === null) continue;

		points.push({ label: xModality.label, share });
	}

	// Il faut deux lignes publiees pour qu un ecart existe.
	if (points.length < 2) return null;

	const sorted = [...points].sort((a, b) => b.share - a.share);
	const high = sorted[0];
	const low = sorted[sorted.length - 1];

	return high && low ? { high, low } : null;
}

/**
 * Les constats d un resultat, du plus parlant au moins parlant.
 *
 * Trois au maximum : au-dela, le lecteur saute le bloc et va au graphique, ce
 * qui revient a ne rien avoir ecrit.
 */
export function insightsOf(outcome: ExploreOutcome): readonly Insight[] {
	if (outcome.kind === 'too-small') return [];

	if (outcome.kind === 'distribution') {
		return [dominantOf(outcome.distribution), nonResponseOf(outcome.distribution)].filter(
			(insight): insight is DominantInsight | NonResponseInsight => insight !== null
		);
	}

	return [gapOf(outcome.crosstab)].filter((insight): insight is GapInsight => insight !== null);
}
