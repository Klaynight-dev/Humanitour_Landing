import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { xlsxFormat } from './xlsx';

/** Fabrique un classeur en memoire, pour tester la lecture sans fichier temoin. */
function workbook(rows: Record<string, unknown>[], sheetName = 'Feuille1'): Uint8Array {
	const book = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), sheetName);
	return new Uint8Array(XLSX.write(book, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer);
}

describe('xlsxFormat', () => {
	it('lit la premiere feuille', () => {
		const result = xlsxFormat.parse(workbook([{ priorite: 'sante', age: 34 }]));

		expect(result.columns).toEqual(['priorite', 'age']);
		expect(result.rows[0]?.priorite).toBe('sante');
		expect(result.rows[0]?.age).toBe(34);
	});

	it('conserve les cellules vides plutot que de les faire disparaitre', () => {
		// Sans cela, une cellule non remplie serait indistinguable d une colonne
		// absente, et la non-reponse ne serait plus comptee.
		const result = xlsxFormat.parse(workbook([{ priorite: 'sante', age: null }]));

		expect(Object.keys(result.rows[0] ?? {})).toContain('age');
	});

	it('lit plusieurs lignes', () => {
		const result = xlsxFormat.parse(
			workbook([
				{ priorite: 'sante' },
				{ priorite: 'ecologie' },
				{ priorite: 'securite' }
			])
		);

		expect(result.rows).toHaveLength(3);
	});

	it('refuse un contenu qui n est pas un classeur', () => {
		// SheetJS rend une feuille vide au lieu de lever : sans garde-fou, un
		// fichier corrompu s'importerait en silence comme « 0 ligne ».
		expect(() => xlsxFormat.parse(new TextEncoder().encode('pas un classeur'))).toThrow(
			/aucune colonne exploitable/i
		);
	});
});
