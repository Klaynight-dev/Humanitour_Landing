import { describe, expect, it } from 'vitest';
import { NON_RESPONSE_KEY, type ModalityDescriptor } from '$shared/questions';
import type { AnswerRow } from './aggregate';
import type { Axis } from './explore';
import { everyone, restrictTo } from './population';
import { buildTimeline, isoWeek } from './timeline';

describe('isoWeek', () => {
	/*
	 * References calculees par un second algorithme, independant de celui du
	 * module (la methode du jeudi par `setUTCDate`) : le test compare deux
	 * implementations, pas l implementation a elle-meme.
	 */
	it.each([
		['2026-08-17T00:00:00Z', '2026-W34'],
		['2026-08-24T00:00:00Z', '2026-W35'],
		['2026-01-01T00:00:00Z', '2026-W01'],
		['2025-12-29T00:00:00Z', '2026-W01'],
		['2024-12-30T00:00:00Z', '2025-W01'],
		['2027-01-01T12:00:00Z', '2026-W53']
	])('range %s en %s', (date, attendu) => {
		expect(isoWeek(new Date(date)).key).toBe(attendu);
	});

	it('garde un dimanche soir dans sa semaine, quel que soit le fuseau du serveur', () => {
		expect(isoWeek(new Date('2026-08-23T23:30:00Z')).key).toBe('2026-W34');
	});

	it('fait commencer la semaine le lundi a minuit UTC', () => {
		expect(isoWeek(new Date('2026-08-20T15:00:00Z')).start.toISOString()).toBe(
			'2026-08-17T00:00:00.000Z'
		);
	});
});

const PRIORITE: readonly ModalityDescriptor[] = [
	{ key: 'sante', label: 'La santé', isNonResponse: false },
	{ key: 'ecologie', label: "L'écologie", isNonResponse: false },
	{ key: NON_RESPONSE_KEY, label: 'Sans réponse', isNonResponse: true }
];

/**
 * Un terrain de trois semaines :
 *   - W34 : quatre repondants, trois « sante », un sans reponse ;
 *   - W35 : AUCUN entretien, la semaine creuse du milieu ;
 *   - W36 : deux repondants, sous un seuil de 3.
 */
const DATES = new Map<string, Date>([
	['a', new Date('2026-08-17T10:00:00Z')],
	['b', new Date('2026-08-18T10:00:00Z')],
	['c', new Date('2026-08-19T10:00:00Z')],
	['d', new Date('2026-08-20T10:00:00Z')],
	['e', new Date('2026-08-31T10:00:00Z')],
	['f', new Date('2026-09-01T10:00:00Z')]
]);

const ROWS: readonly AnswerRow[] = [
	{ responseId: 'a', modalityKey: 'sante' },
	{ responseId: 'b', modalityKey: 'sante' },
	{ responseId: 'c', modalityKey: 'sante' },
	{ responseId: 'd', modalityKey: NON_RESPONSE_KEY },
	{ responseId: 'e', modalityKey: 'ecologie' },
	{ responseId: 'f', modalityKey: 'ecologie' }
];

const X: Axis = { code: 'priorite', label: 'Priorité', modalities: PRIORITE, rows: ROWS };

function timeline(options: { threshold?: number; includeNonResponses?: boolean } = {}) {
	return buildTimeline(
		{
			x: X,
			y: null,
			population: everyone(DATES.size),
			threshold: options.threshold ?? 1,
			includeNonResponses: options.includeNonResponses ?? true
		},
		DATES
	);
}

function seriesOf(result: ReturnType<typeof timeline>, key: string) {
	return result.series.find((series) => series.key === key);
}

describe('buildTimeline', () => {
	it('range le terrain par semaine, dans l ordre', () => {
		expect(timeline().periods.map((period) => period.key)).toEqual([
			'2026-W34',
			'2026-W35',
			'2026-W36'
		]);
	});

	it('fait apparaitre la semaine sans entretien au lieu de relier ses voisines', () => {
		const semaineCreuse = timeline().periods[1];

		expect(semaineCreuse?.key).toBe('2026-W35');
		expect(semaineCreuse?.respondents).toBeNull();
	});

	it('trace un trou et non un zero pour une semaine masquee', () => {
		const sante = seriesOf(timeline(), 'sante');

		expect(sante?.shares[1]).toBeNull();
		expect(sante?.shares[1]).not.toBe(0);
	});

	it('calcule la part de chaque modalite dans sa semaine', () => {
		const result = timeline();

		// W34 : trois « sante » sur quatre repondants.
		expect(seriesOf(result, 'sante')?.shares[0]).toBeCloseTo(0.75, 6);
		// W36 : deux « ecologie » sur deux.
		expect(seriesOf(result, 'ecologie')?.shares[2]).toBeCloseTo(1, 6);
	});

	it('publie l effectif de chaque semaine qui passe le seuil', () => {
		expect(timeline().periods.map((period) => period.respondents)).toEqual([4, null, 2]);
	});

	it('masque entierement une semaine sous le seuil, effectif compris', () => {
		const result = timeline({ threshold: 3 });
		const w36 = result.periods[2];

		expect(w36?.respondents).toBeNull();
		expect(result.series.every((series) => series.shares[2] === null)).toBe(true);
	});

	it('compte les semaines masquees', () => {
		expect(timeline({ threshold: 3 }).suppressedPeriods).toBe(2);
	});

	it('garde la non-reponse comme une serie a part entiere', () => {
		const nsp = seriesOf(timeline(), NON_RESPONSE_KEY);

		expect(nsp?.isNonResponse).toBe(true);
		expect(nsp?.shares[0]).toBeCloseTo(0.25, 6);
	});

	it('retire la non-reponse quand on le demande', () => {
		const result = timeline({ includeNonResponses: false });

		expect(result.series.map((series) => series.key)).toEqual(['sante', 'ecologie']);
	});

	it('suit l ordre declare des modalites, pas leur frequence', () => {
		expect(timeline().series.map((series) => series.key)).toEqual([
			'sante',
			'ecologie',
			NON_RESPONSE_KEY
		]);
	});

	it('aligne chaque serie sur les periodes', () => {
		const result = timeline();

		for (const series of result.series) {
			expect(series.shares).toHaveLength(result.periods.length);
		}
	});

	it('ignore le second axe : une evolution croise deja avec le temps', () => {
		const avecY = buildTimeline(
			{
				x: X,
				y: X,
				population: everyone(DATES.size),
				threshold: 1,
				includeNonResponses: true
			},
			DATES
		);

		expect(avecY.series.map((series) => series.key)).toEqual(
			timeline().series.map((series) => series.key)
		);
	});

	it('ne retient que les repondants de la population filtree', () => {
		// Filtre qui ne garde que la semaine W36.
		const result = buildTimeline(
			{
				x: X,
				y: null,
				population: restrictTo(DATES.size, [new Set(['e', 'f'])]),
				threshold: 1,
				includeNonResponses: true
			},
			DATES
		);

		expect(result.periods.map((period) => period.key)).toEqual(['2026-W36']);
		expect(result.periods[0]?.respondents).toBe(2);
	});

	it('rend une evolution vide sans aucune date', () => {
		const result = buildTimeline(
			{ x: X, y: null, population: everyone(0), threshold: 1, includeNonResponses: true },
			new Map()
		);

		expect(result.periods).toEqual([]);
		expect(result.series.every((series) => series.shares.length === 0)).toBe(true);
	});

	it('lit les parts redressees quand un poids est fourni', () => {
		// « d » (sans reponse) pese trois fois plus : W34 passe a 3 sur 6.
		const result = buildTimeline(
			{
				x: X,
				y: null,
				population: everyone(DATES.size),
				threshold: 1,
				includeNonResponses: true,
				weights: new Map([
					['a', 1],
					['b', 1],
					['c', 1],
					['d', 3],
					['e', 1],
					['f', 1]
				])
			},
			DATES
		);

		expect(seriesOf(result, 'sante')?.shares[0]).toBeCloseTo(0.5, 6);
	});
});
