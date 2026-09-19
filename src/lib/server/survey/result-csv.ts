import { escapeCsv } from './export';
import type { ExploreOutcome, Panel } from './explore';

/**
 * Export du resultat AFFICHE, filtres compris.
 *
 * A ne pas confondre avec l export brut de `export.ts`, qui donne l enquete
 * entiere reponse par reponse. Celui-ci donne exactement le tableau qu on a
 * sous les yeux : un graphique repris dans un article doit pouvoir voyager avec
 * les chiffres qui l ont produit, pas avec un jeu de donnees de 1 000 lignes ou
 * le lecteur devra refaire le comptage et risquera de trouver autre chose.
 *
 * Les cases masquees par le seuil d anonymat sortent VIDES et marquees. Les
 * omettre laisserait croire a un trou dans la collecte ; y mettre un zero
 * serait un mensonge.
 */

/**
 * BOM UTF-8, ecrit par son code.
 *
 * Sans lui, un tableur ouvre le fichier dans l encodage local de la machine
 * et les accents deviennent illisibles. Ecrit par son code plutot qu en
 * caractere : un BOM litteral est invisible a la relecture, et la regle de
 * lint sur les espaces irreguliers le refuse a juste titre.
 */
const BOM = String.fromCharCode(0xfeff);

/** Fin de ligne CSV, comme l export brut. */
const CRLF = '\r\n';

/** Marqueur des cases masquees, dans la colonne prevue pour ca. */
const MASQUE = 'oui';
const PUBLIE = 'non';

function line(cells: readonly (string | number | null)[]): string {
	return cells.map((cell) => escapeCsv(cell === null ? '' : String(cell))).join(',');
}

/** Part en notation decimale a quatre chiffres : un tableur la relira comme un nombre. */
function share(value: number | null): string | null {
	return value === null ? null : value.toFixed(4);
}

export function resultToCsv(outcome: ExploreOutcome): string {
	const lines = rowsFor(outcome);

	return `${BOM}${lines.join(CRLF)}${CRLF}`;
}

function rowsFor(outcome: ExploreOutcome): readonly string[] {
	if (outcome.kind === 'distribution') return distributionRows(outcome);
	if (outcome.kind === 'crosstab') return crosstabRows(outcome);

	// Population sous le seuil : on rend les en-tetes et rien d autre. Un fichier
	// vide laisserait croire a une panne, une ligne d explication casserait la
	// lecture automatique du fichier.
	return [line(['modalite', 'libelle', 'effectif', 'part', 'masque'])];
}

function distributionRows(
	outcome: Extract<ExploreOutcome, { kind: 'distribution' }>
): readonly string[] {
	const rows = [line(['modalite', 'libelle', 'non_reponse', 'effectif', 'part', 'masque'])];

	for (const bar of outcome.distribution.bars) {
		rows.push(
			line([
				bar.key,
				bar.label,
				bar.isNonResponse ? 'oui' : 'non',
				bar.count,
				share(bar.share),
				bar.suppressed ? MASQUE : PUBLIE
			])
		);
	}

	return rows;
}

function crosstabRows(outcome: Extract<ExploreOutcome, { kind: 'crosstab' }>): readonly string[] {
	const table = outcome.crosstab;
	const rows = [line(['x', 'libelle_x', 'y', 'libelle_y', 'effectif', 'part_ligne', 'masque'])];

	for (const xModality of table.xModalities) {
		for (const yModality of table.yModalities) {
			const cell = table.cells.get(xModality.key)?.get(yModality.key);
			rows.push(
				line([
					xModality.key,
					xModality.label,
					yModality.key,
					yModality.label,
					cell?.count ?? null,
					share(cell?.share ?? null),
					cell?.suppressed ? MASQUE : PUBLIE
				])
			);
		}
	}

	return rows;
}

/**
 * Le meme export, pour un resultat decoupe en petits multiples.
 *
 * Une colonne `panneau` en tete de chaque ligne : le fichier reste plat, donc
 * relisible par un tableur comme par pandas, et la troisieme variable y est
 * une colonne de plus plutot qu une structure imbriquee.
 */
export function panelsToCsv(panels: readonly Panel[]): string {
	const blocks = panels.map((panel) => {
		const [header, ...rows] = rowsFor(panel.outcome);

		return {
			header: `panneau,${header ?? ''}`,
			rows: rows.map((row) => `${escapeCsv(panel.label)},${row}`)
		};
	});

	const header = blocks[0]?.header ?? 'panneau';
	const lines = [header, ...blocks.flatMap((block) => block.rows)];

	return `${BOM}${lines.join(CRLF)}${CRLF}`;
}
