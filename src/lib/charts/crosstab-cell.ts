import type { CrosstabResult } from '$lib/server/survey/aggregate';
import { formatCount, formatShare, SUPPRESSED_SYMBOL } from '$shared/format';

/**
 * Lecture d une case de tableau croise.
 *
 * Une meme case se lit de quatre facons, et elles ne racontent pas la meme
 * chose. C est la decision la plus mal comprise d un tri croise, donc elle est
 * explicite ici plutot que cachee dans un composant :
 *
 *   - `ligne`   : « parmi les Bretons, 30 % citent le pouvoir d achat » ;
 *   - `colonne` : « parmi ceux qui citent le pouvoir d achat, 12 % sont bretons » ;
 *   - `total`   : « 4 % des repondants sont bretons ET citent le pouvoir d achat » ;
 *   - `effectif`: le comptage brut, sans division.
 *
 * Les trois premieres sont des parts du MEME effectif, avec trois bases
 * differentes. Afficher l une en croyant lire l autre est l erreur classique,
 * et c est pour cela que la base choisie est ecrite a l ecran et voyage dans
 * le permalien.
 */
export type CellBasis = 'ligne' | 'colonne' | 'total' | 'effectif';

export const CELL_BASES: readonly { readonly key: CellBasis; readonly label: string }[] = [
	{ key: 'ligne', label: '% en ligne' },
	{ key: 'colonne', label: '% en colonne' },
	{ key: 'total', label: '% du total' },
	{ key: 'effectif', label: 'Effectifs' }
];

export function parseCellBasis(raw: string | null): CellBasis | null {
	return CELL_BASES.find((basis) => basis.key === raw)?.key ?? null;
}

export interface CellReading {
	/** Valeur a comparer : part entre 0 et 1, ou effectif. `null` si masquee. */
	readonly value: number | null;
	/** Ce qui s affiche dans la case. */
	readonly text: string;
	readonly suppressed: boolean;
}

/** Base de division d une case, selon la lecture demandee. */
function denominator(table: CrosstabResult, xKey: string, yKey: string, basis: CellBasis): number {
	if (basis === 'ligne') return table.rowTotals.get(xKey) ?? 0;
	if (basis === 'colonne') return table.columnTotals.get(yKey) ?? 0;
	// En lecture redressee, les cases sont ponderees : leur base totale aussi.
	return table.weighted?.respondents ?? table.respondents;
}

/**
 * Ce que porte une case, dans la lecture demandee.
 *
 * Une case masquee par le seuil d anonymat reste masquee quelle que soit la
 * base : changer de lecture ne doit pas devenir un moyen de retrouver un
 * effectif que le seuil protege.
 */
export function readCell(
	table: CrosstabResult,
	xKey: string,
	yKey: string,
	basis: CellBasis
): CellReading {
	const cell = table.cells.get(xKey)?.get(yKey);

	if (!cell || cell.suppressed || cell.count === null) {
		return { value: null, text: SUPPRESSED_SYMBOL, suppressed: true };
	}

	if (basis === 'effectif') {
		return { value: cell.count, text: formatCount(cell.count), suppressed: false };
	}

	const base = denominator(table, xKey, yKey, basis);
	if (base <= 0) return { value: null, text: SUPPRESSED_SYMBOL, suppressed: true };

	const share = cell.count / base;
	return { value: share, text: formatShare(share), suppressed: false };
}

/**
 * Plus grande valeur publiee du tableau, dans la lecture demandee.
 *
 * Sert d echelle a l intensite des couleurs. Calculee sur les cases PUBLIEES
 * seulement : une case masquee ne doit pas etaler la rampe et faire paraitre
 * toutes les autres pales.
 */
export function maxCellValue(table: CrosstabResult, basis: CellBasis): number {
	let max = 0;

	for (const xModality of table.xModalities) {
		for (const yModality of table.yModalities) {
			const reading = readCell(table, xModality.key, yModality.key, basis);
			if (reading.value !== null && reading.value > max) max = reading.value;
		}
	}

	return max;
}
