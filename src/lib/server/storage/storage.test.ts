import { describe, expect, it } from 'vitest';
import { safeKeySegment } from './types';

describe('safeKeySegment', () => {
	it('conserve un nom de fichier ordinaire', () => {
		expect(safeKeySegment('reponses-etape-12.csv')).toBe('reponses-etape-12.csv');
	});

	it('retire les separateurs de chemin', () => {
		// Le nom vient d'un televersement : il peut contenir n'importe quoi.
		expect(safeKeySegment('../../etc/passwd')).toBe('passwd');
		expect(safeKeySegment(String.raw`C:\Users\a\fichier.csv`)).toBe('fichier.csv');
	});

	it('translittere les accents et remplace les caracteres inattendus', () => {
		expect(safeKeySegment('réponses été.csv')).toBe('reponses-ete.csv');
	});

	it('ne laisse pas un nom commencer par un point', () => {
		expect(safeKeySegment('.htaccess')).toBe('htaccess');
	});

	it('borne la longueur', () => {
		expect(safeKeySegment('x'.repeat(500)).length).toBeLessThanOrEqual(120);
	});

	it('rend un nom de repli plutot qu une chaine vide', () => {
		expect(safeKeySegment('...')).toBe('fichier');
		expect(safeKeySegment('///')).toBe('fichier');
	});
});
