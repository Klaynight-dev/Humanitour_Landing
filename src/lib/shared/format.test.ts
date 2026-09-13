import { describe, expect, it } from 'vitest';
import {
	formatBase,
	formatCount,
	formatDate,
	formatFieldwork,
	formatShare,
	SUPPRESSED_SYMBOL
} from './format';

/**
 * Les espaces produits par Intl en francais sont des espaces insecables
 * etroites (U+202F) ou insecables (U+00A0), pas des espaces ordinaires.
 * On compare donc sur une version normalisee.
 */
function plain(value: string): string {
	return value.replace(/[\u202f\u00a0]/g, ' ');
}

describe('formatCount', () => {
	it('groupe les milliers', () => {
		expect(plain(formatCount(1234))).toBe('1 234');
	});

	it('laisse les petits nombres intacts', () => {
		expect(formatCount(7)).toBe('7');
		expect(formatCount(0)).toBe('0');
	});

	it('affiche le symbole de masquage pour une valeur masquee', () => {
		expect(formatCount(null)).toBe(SUPPRESSED_SYMBOL);
	});
});

describe('formatShare', () => {
	it('affiche une decimale', () => {
		// Une decimale de plus suggererait une precision que l echantillon n a pas.
		expect(plain(formatShare(0.6234))).toBe('62,3 %');
	});

	it('arrondit correctement', () => {
		expect(plain(formatShare(0.5))).toBe('50,0 %');
		expect(plain(formatShare(1))).toBe('100,0 %');
		expect(plain(formatShare(0))).toBe('0,0 %');
	});

	it('affiche le symbole de masquage pour une part masquee', () => {
		expect(formatShare(null)).toBe(SUPPRESSED_SYMBOL);
	});
});

describe('formatBase', () => {
	it('annonce la base au pluriel', () => {
		expect(plain(formatBase(1200))).toBe('base : 1 200 repondants');
	});

	it('accorde au singulier', () => {
		expect(formatBase(1)).toBe('base : 1 repondant');
	});

	it('le dit quand il n y a personne', () => {
		expect(formatBase(0)).toBe('aucun repondant');
	});
});

describe('formatDate', () => {
	it('ecrit la date en toutes lettres', () => {
		expect(plain(formatDate(new Date('2026-07-04T12:00:00Z')))).toContain('juillet');
	});

	it('accepte une chaine ISO', () => {
		expect(formatDate('2026-07-04T12:00:00Z')).not.toBe('');
	});

	it('rend une chaine vide pour une date absente ou invalide', () => {
		expect(formatDate(null)).toBe('');
		expect(formatDate('pas une date')).toBe('');
	});
});

describe('formatFieldwork', () => {
	const start = new Date('2026-06-15T00:00:00Z');
	const end = new Date('2026-08-20T00:00:00Z');

	it('annonce une periode complete', () => {
		const text = formatFieldwork(start, end);
		expect(text).toMatch(/^Terrain du /);
		expect(text).toContain(' au ');
	});

	it('gere une periode encore ouverte', () => {
		expect(formatFieldwork(start, null)).toMatch(/^Terrain depuis le /);
	});

	it('gere une periode dont seul la fin est connue', () => {
		expect(formatFieldwork(null, end)).toMatch(/^Terrain jusqu au /);
	});

	it('rend une chaine vide quand rien n est renseigne', () => {
		expect(formatFieldwork(null, null)).toBe('');
	});
});
