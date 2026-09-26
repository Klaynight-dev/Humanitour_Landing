import { describe, expect, it } from 'vitest';
import type { TimelineResult, TimelineSeries } from '$lib/server/survey/timeline';
import { CATEGORICAL, colorSlots, NON_RESPONSE_COLOR } from '../palette';
import { CHART_MUTED } from './theme';
import { foldTimeline, OTHERS_KEY, TIMELINE_NAMED_MAX, timelineOption } from './options';

/** Trois semaines, la deuxieme masquee. */
const PERIODS: TimelineResult['periods'] = [
	{ key: '2026-W34', start: new Date('2026-08-17T00:00:00Z'), respondents: 40 },
	{ key: '2026-W35', start: new Date('2026-08-24T00:00:00Z'), respondents: null },
	{ key: '2026-W36', start: new Date('2026-08-31T00:00:00Z'), respondents: 52 }
];

function serie(
	key: string,
	shares: (number | null)[],
	isNonResponse = false
): TimelineSeries {
	return { key, label: key.toUpperCase(), isNonResponse, color: null, shares };
}

function result(series: TimelineSeries[]): TimelineResult {
	return { periods: PERIODS, series, threshold: 5, suppressedPeriods: 1 };
}

function contextFor(series: TimelineSeries[]) {
	return {
		question: 'Priorité',
		colorSlots: colorSlots(
			series.map((entry) => ({
				key: entry.key,
				label: entry.label,
				isNonResponse: entry.isNonResponse
			}))
		),
		basis: 'ligne' as const
	};
}

/** Les series ECharts d une option, typees juste assez pour les lire. */
interface LineSeries {
	name: string;
	connectNulls: boolean;
	lineStyle: { color: string; type: string; width: number };
	endLabel: { show: boolean };
	data: { value: number | null; tooltip: { formatter: string } }[];
}

function linesOf(series: TimelineSeries[]): LineSeries[] {
	const built = timelineOption(result(series), contextFor(series));
	return (built.option as { series: LineSeries[] }).series;
}

const SANTE = serie('sante', [0.4, null, 0.5]);
const ECOLOGIE = serie('ecologie', [0.3, null, 0.2]);
const NSP = serie('nsp', [0.1, null, 0.05], true);

describe('foldTimeline', () => {
	it('ne replie rien tant que la palette suffit', () => {
		const { named, others } = foldTimeline([SANTE, ECOLOGIE, NSP]);

		expect(others).toBeNull();
		expect(named.map((entry) => entry.key)).toEqual(['sante', 'ecologie', 'nsp']);
	});

	it('garde huit reponses sans repli : sept nommees plus la huitieme place', () => {
		const huit = Array.from({ length: 8 }, (_, i) => serie(`m${i}`, [0.1, null, 0.1]));

		expect(foldTimeline(huit).others).toBeNull();
	});

	/** Neuf partis, du plus au moins present : p8 est le plus faible. */
	const NEUF = Array.from({ length: 9 }, (_, i) => serie(`p${i}`, [0.2 - i * 0.02, null, 0.2 - i * 0.02]));

	it('replie au-dela de la palette dans une serie « Autres »', () => {
		const { named, others } = foldTimeline(NEUF);

		expect(named).toHaveLength(TIMELINE_NAMED_MAX);
		expect(others?.key).toBe(OTHERS_KEY);
	});

	it('garde les modalites les plus presentes, pas les premieres declarees', () => {
		// On declare le plus faible en premier : il doit quand meme etre replie.
		const inverse = [...NEUF].reverse();
		const { named } = foldTimeline(inverse);

		expect(named.map((entry) => entry.key)).not.toContain('p8');
		expect(named.map((entry) => entry.key)).not.toContain('p7');
	});

	it('conserve l ordre declare parmi les modalites gardees', () => {
		const inverse = [...NEUF].reverse();
		const { named } = foldTimeline(inverse);

		expect(named.map((entry) => entry.key)).toEqual(['p6', 'p5', 'p4', 'p3', 'p2', 'p1', 'p0']);
	});

	it('somme les modalites repliees, periode par periode', () => {
		const { others } = foldTimeline(NEUF);

		// p7 + p8 = (0.2 - 0.14) + (0.2 - 0.16).
		expect(others?.shares[0]).toBeCloseTo(0.1, 6);
	});

	it('laisse un trou dans « Autres » des qu une modalite repliee est masquee', () => {
		const masquee = NEUF.map((entry) =>
			entry.key === 'p8' ? { ...entry, shares: [null, null, 0.04] } : entry
		);
		const { others } = foldTimeline(masquee);

		expect(others?.shares[0]).toBeNull();
		expect(others?.shares[2]).not.toBeNull();
	});

	it('ne replie jamais la non-reponse', () => {
		const { named } = foldTimeline([...NEUF, NSP]);

		expect(named.map((entry) => entry.key)).toContain('nsp');
	});

	it('annonce combien de reponses « Autres » regroupe', () => {
		expect(foldTimeline(NEUF).others?.label).toBe('Autres (2 réponses)');
	});

	it('classe une modalite jamais publiee en derniere', () => {
		const jamais = [...NEUF.slice(0, 8), serie('fantome', [null, null, null])];
		const { named } = foldTimeline(jamais);

		expect(named.map((entry) => entry.key)).not.toContain('fantome');
	});
});

describe('timelineOption', () => {
	it('trace une courbe par modalite', () => {
		expect(linesOf([SANTE, ECOLOGIE, NSP]).map((line) => line.name)).toEqual([
			'SANTE',
			'ECOLOGIE',
			'NSP'
		]);
	});

	it('interrompt la courbe sur une semaine masquee au lieu de la relier', () => {
		const [sante] = linesOf([SANTE, ECOLOGIE]);

		expect(sante?.connectNulls).toBe(false);
		expect(sante?.data[1]?.value).toBeNull();
	});

	it('ecrit la part en pourcentage a une decimale', () => {
		const [sante] = linesOf([SANTE, ECOLOGIE]);

		expect(sante?.data[0]?.value).toBe(40);
	});

	it('compose l infobulle avec le formatage du projet et la base de la semaine', () => {
		const [sante] = linesOf([SANTE, ECOLOGIE]);
		const bulle = sante?.data[0]?.tooltip.formatter ?? '';

		expect(bulle).toContain('Semaine du 17 août');
		expect(bulle).toContain('40,0');
		expect(bulle).toContain('base : 40 répondants');
		// Jamais la virgule anglaise d un gabarit ECharts.
		expect(bulle).not.toContain('40.0');
	});

	it('explique une semaine masquee au lieu d afficher un zero', () => {
		const [sante] = linesOf([SANTE, ECOLOGIE]);

		expect(sante?.data[1]?.tooltip.formatter).toContain('Effectif insuffisant');
	});

	it('peint la non-reponse en gris, quelle que soit sa place', () => {
		const lignes = linesOf([SANTE, ECOLOGIE, NSP]);

		expect(lignes[2]?.lineStyle.color).toBe(NON_RESPONSE_COLOR);
	});

	it('etiquette directement jusqu a quatre courbes', () => {
		expect(linesOf([SANTE, ECOLOGIE, NSP]).every((line) => line.endLabel.show)).toBe(true);
	});

	it('laisse la legende prendre le relais au-dela de quatre courbes', () => {
		const cinq = Array.from({ length: 5 }, (_, i) => serie(`m${i}`, [0.1, null, 0.1]));

		expect(linesOf(cinq).every((line) => !line.endLabel.show)).toBe(true);
	});

	it('distingue « Autres » par un trait pointille, sans teinte de plus', () => {
		const neuf = Array.from({ length: 9 }, (_, i) => serie(`p${i}`, [0.2 - i * 0.02, null, 0.1]));
		const autres = linesOf(neuf).at(-1);

		expect(autres?.lineStyle.type).toBe('dashed');
		expect(autres?.lineStyle.color).toBe(CHART_MUTED);
		expect(CATEGORICAL).not.toContain(autres?.lineStyle.color);
	});

	it('n utilise que des teintes de la palette validee en repli', () => {
		const neuf = Array.from({ length: 9 }, (_, i) => serie(`p${i}`, [0.2 - i * 0.02, null, 0.1]));
		const nommees = linesOf(neuf).slice(0, TIMELINE_NAMED_MAX);

		for (const ligne of nommees) expect(CATEGORICAL).toContain(ligne.lineStyle.color);
	});

	it('trace des lignes de deux pixels', () => {
		expect(linesOf([SANTE, ECOLOGIE]).every((line) => line.lineStyle.width === 2)).toBe(true);
	});

	it('fait partir l axe des parts de zero', () => {
		const built = timelineOption(result([SANTE, ECOLOGIE]), contextFor([SANTE, ECOLOGIE]));

		expect((built.option as { yAxis: { min: number } }).yAxis.min).toBe(0);
	});

	it('reste serialisable en JSON, pour traverser du serveur au navigateur', () => {
		const built = timelineOption(result([SANTE, ECOLOGIE, NSP]), contextFor([SANTE, ECOLOGIE, NSP]));

		expect(() => JSON.parse(JSON.stringify(built.option))).not.toThrow();
		expect(JSON.stringify(built.option)).not.toContain('function');
	});
});
