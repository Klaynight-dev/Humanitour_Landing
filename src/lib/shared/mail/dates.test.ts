import { describe, expect, it } from 'vitest';
import { formatListDate, formatMessageDate } from './dates';

const now = new Date('2026-09-29T15:00:00Z');

describe('formatListDate', () => {
	it('donne l heure de Paris pour un message du jour', () => {
		expect(formatListDate(new Date('2026-09-29T07:05:00Z'), now)).toBe('09:05');
	});

	it('donne le jour et le mois pour cette annee', () => {
		expect(formatListDate('2026-03-02T10:00:00Z', now)).toBe('2 mars');
	});

	it('ajoute l annee pour une annee passee', () => {
		expect(formatListDate('2025-12-31T10:00:00Z', now)).toBe('31 déc. 2025');
	});

	it('juge le jour a l heure de Paris, pas en UTC', () => {
		// 23 h 30 UTC le 28 est deja le 29 a Paris.
		expect(formatListDate('2026-09-28T23:30:00Z', now)).toBe('01:30');
	});

	it('utilise l horloge par defaut', () => {
		expect(formatListDate(new Date())).toMatch(/^\d{2}:\d{2}$/);
	});
});

describe('formatMessageDate', () => {
	it('ecrit la date complete', () => {
		expect(formatMessageDate('2026-09-29T12:03:00Z')).toBe('mardi 29 septembre 2026 à 14:03');
	});
});
