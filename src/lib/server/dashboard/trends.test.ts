import { describe, expect, it } from 'vitest';
import { startOfWeek, weeklyTrend } from './trends';

/** Raccourci de lecture : une date UTC a minuit. */
function day(iso: string): Date {
	return new Date(`${iso}T12:00:00Z`);
}

/** `n` reponses collectees le meme jour. */
function times(iso: string, n: number): Date[] {
	return Array.from({ length: n }, () => day(iso));
}

describe('startOfWeek', () => {
	it('ramene un mercredi au lundi de sa semaine', () => {
		expect(startOfWeek(day('2026-07-08')).toISOString().slice(0, 10)).toBe('2026-07-06');
	});

	it('ramene un dimanche au lundi precedent, pas au lendemain', () => {
		expect(startOfWeek(day('2026-07-12')).toISOString().slice(0, 10)).toBe('2026-07-06');
	});

	it('laisse un lundi en place', () => {
		expect(startOfWeek(day('2026-07-06')).toISOString().slice(0, 10)).toBe('2026-07-06');
	});
});

describe('weeklyTrend', () => {
	it('rend une serie vide sans reponse', () => {
		const series = weeklyTrend([], 5);
		expect(series.points).toEqual([]);
		expect(series.total).toBe(0);
	});

	it('regroupe les reponses par semaine', () => {
		const series = weeklyTrend([...times('2026-07-06', 6), ...times('2026-07-08', 4)], 5);

		expect(series.points).toHaveLength(1);
		expect(series.points.at(0)?.count).toBe(10);
		expect(series.total).toBe(10);
	});

	it('conserve les semaines creuses entre deux semaines peuplees', () => {
		const series = weeklyTrend([...times('2026-07-06', 8), ...times('2026-07-20', 8)], 5);

		expect(series.points.map((point) => point.key)).toEqual([
			'2026-07-06',
			'2026-07-13',
			'2026-07-20'
		]);
		// Une semaine sans reponse vaut zero : elle ne revele personne et se publie.
		expect(series.points.at(1)?.count).toBe(0);
		expect(series.points.at(1)?.suppressed).toBe(false);
	});

	it('masque une semaine sous le seuil d anonymat', () => {
		const series = weeklyTrend([...times('2026-07-06', 20), ...times('2026-07-13', 2)], 5);

		const small = series.points.find((point) => point.key === '2026-07-13');
		expect(small?.suppressed).toBe(true);
		expect(small?.count).toBeNull();
		expect(series.suppressedCount).toBeGreaterThan(0);
	});

	it('masque une seconde semaine quand la premiere se retrouverait par soustraction', () => {
		// Une seule case masquee et un total publie : la valeur masquee se deduit.
		// La seconde passe doit donc masquer une autre semaine.
		const series = weeklyTrend([...times('2026-07-06', 20), ...times('2026-07-13', 2)], 5);

		expect(series.points.filter((point) => point.suppressed).length).toBeGreaterThanOrEqual(2);
	});

	it('ne masque rien quand toutes les semaines atteignent le seuil', () => {
		const series = weeklyTrend([...times('2026-07-06', 9), ...times('2026-07-13', 7)], 5);

		expect(series.points.every((point) => !point.suppressed)).toBe(true);
		expect(series.suppressedCount).toBe(0);
	});

	it('ne modifie pas le tableau de dates recu', () => {
		const dates = [day('2026-07-20'), day('2026-07-06')];
		weeklyTrend(dates, 5);

		expect(dates.at(0)?.toISOString().slice(0, 10)).toBe('2026-07-20');
	});
});
