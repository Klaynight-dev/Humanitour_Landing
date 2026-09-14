import * as XLSX from 'xlsx';
import type { ImportFormat, RowSet } from './types';

/**
 * Import de tableur.
 *
 * Seule la premiere feuille est lue : un classeur multi-feuilles laisserait
 * l operateur croire que tout a ete importe.
 */
export const xlsxFormat: ImportFormat = {
	key: 'xlsx',
	label: 'Tableur (XLSX, ODS)',
	extensions: ['.xlsx', '.xls', '.ods'],
	mimeTypes: [
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		'application/vnd.ms-excel',
		'application/vnd.oasis.opendocument.spreadsheet'
	],

	parse(content): RowSet {
		const workbook = XLSX.read(content, { type: 'array' });
		const sheetName = workbook.SheetNames[0];

		if (!sheetName) throw new Error('Le classeur ne contient aucune feuille.');

		const sheet = workbook.Sheets[sheetName];
		if (!sheet) throw new Error('Feuille introuvable.');

		// `defval: null` conserve les cellules vides : sans cela une cellule non
		// remplie disparaitrait de l objet et ne serait plus distinguable d une
		// colonne absente.
		const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
			defval: null,
			raw: true
		});

		const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))].map((column) =>
			column.trim()
		);

		// SheetJS ne leve pas sur un contenu qui n est pas un classeur : il rend une
		// feuille vide. Sans ce garde-fou, deposer un fichier corrompu afficherait
		// « 0 ligne importee » sans dire pourquoi, et l operateur chercherait
		// l erreur dans sa correspondance de colonnes.
		if (columns.length === 0) {
			throw new Error(
				"Le fichier ne contient aucune colonne exploitable. Vérifiez qu'il s'agit bien d'un classeur et que la première ligne porte les en-têtes."
			);
		}

		return { columns, rows };
	}
};
