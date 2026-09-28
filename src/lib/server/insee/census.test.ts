import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	buildCensusReference,
	clearCensusCache,
	loadCensusReference,
	METROPOLITAN_REGIONS
} from './census';
import type { MelodiObservation } from './melodi';

function obs(dimensions: Record<string, string>, value: number): MelodiObservation {
	return { dimensions: { TIME_PERIOD: '2023', ...dimensions }, value };
}

/** Un pays jouet : 10 personnes par age et par sexe, de 0 a 99 ans, et 4 centenaires. */
function metropole(): MelodiObservation[] {
	const observations: MelodiObservation[] = [];
	for (let age = 0; age < 100; age += 1) {
		observations.push(obs({ SEX: 'F', AGE: `Y${age}` }, 11));
		observations.push(obs({ SEX: 'M', AGE: `Y${age}` }, 9));
		observations.push(obs({ SEX: '_T', AGE: `Y${age}` }, 20));
	}
	observations.push(obs({ SEX: '_T', AGE: 'Y_GE100' }, 4));
	observations.push(obs({ SEX: 'F', AGE: 'Y_GE100' }, 3));
	observations.push(obs({ SEX: 'M', AGE: 'Y_GE100' }, 1));
	// Totaux et millesime ancien : ignores.
	observations.push(obs({ SEX: '_T', AGE: '_T' }, 2004));
	observations.push(obs({ SEX: '_T', AGE: 'Y40', TIME_PERIOD: '2022' }, 999_999));
	return observations;
}

describe('buildCensusReference', () => {
	const reference = buildCensusReference({
		metropole: metropole(),
		regions: [
			obs({ GEO: '2026-REG-11', SEX: '_T', AGE: 'Y30' }, 30),
			obs({ GEO: '2026-REG-11', SEX: '_T', AGE: 'Y10' }, 500),
			obs({ GEO: '2026-REG-53', SEX: '_T', AGE: 'Y_GE100' }, 7),
			obs({ GEO: '2026-REG-53', SEX: 'F', AGE: 'Y30' }, 800),
			obs({ GEO: 'inconnu', SEX: '_T', AGE: 'Y30' }, 800)
		],
		pcs: [
			obs({ SEX: '_T', AGE: 'Y15T19', PCS: '9' }, 100),
			obs({ SEX: '_T', AGE: 'Y20T24', PCS: '9' }, 50),
			obs({ SEX: '_T', AGE: 'Y_GE65', PCS: '7' }, 70),
			obs({ SEX: '_T', AGE: 'Y_GE15', PCS: '7' }, 1_000_000),
			obs({ SEX: '_T', AGE: 'Y30T34', PCS: '_T' }, 1_000_000),
			obs({ SEX: 'F', AGE: 'Y30T34', PCS: '3' }, 1_000_000)
		],
		fetchedAt: new Date('2026-09-28T10:00:00.000Z')
	});

	it('retient le millesime le plus recent et ignore les autres', () => {
		expect(reference.period).toBe('2023');
		expect(reference.ages[40]).toBe(20);
	});

	it('compte les adultes de 18 ans ou plus, centenaires compris', () => {
		expect(reference.adults).toBe(82 * 20 + 4);
		expect(reference.ages[100]).toBe(4);
	});

	it('rend le sexe des seuls adultes', () => {
		expect(reference.sex).toEqual({ F: 82 * 11 + 3, M: 82 * 9 + 1 });
	});

	it('somme les adultes par region, sans les mineurs ni le detail par sexe', () => {
		expect(reference.regions).toEqual({ '11': 30, '53': 7 });
	});

	it('ne garde des 15-19 ans de POP6 que la part des 18-19 ans', () => {
		// Ages egaux dans le pays jouet : 18 et 19 font 2 ages sur 5.
		expect(reference.pcsYoungShare).toBeCloseTo(0.4, 10);
		expect(reference.pcs['9']).toBeCloseTo(100 * 0.4 + 50, 10);
		expect(reference.pcs['7']).toBe(70);
		expect(reference.pcs['3']).toBeUndefined();
	});

	it('refuse un tableau sans adultes', () => {
		expect(() =>
			buildCensusReference({ metropole: [], regions: [], pcs: [], fetchedAt: new Date() })
		).toThrow(/aucun adulte/);
	});

	it('supporte une tranche 15-19 vide', () => {
		const young = metropole().filter(
			(observation) =>
				!['Y15', 'Y16', 'Y17', 'Y18', 'Y19'].includes(observation.dimensions.AGE ?? '')
		);
		const withoutTeens = buildCensusReference({
			metropole: young,
			regions: [],
			pcs: [],
			fetchedAt: new Date()
		});

		expect(withoutTeens.pcsYoungShare).toBe(0);
	});
});

describe('loadCensusReference', () => {
	afterEach(() => clearCensusCache());

	function fakeMelodi() {
		return vi.fn(async (input: string | URL | Request) => {
			const url = new URL(String(input));
			const dataset = url.pathname.split('/').at(-1);
			const geos = url.searchParams.getAll('GEO');

			let observations: MelodiObservation[];
			if (dataset === 'DS_RP_TD_POPULATION_AGESEX_PRINC' && geos[0] === 'FRANCE-FM') {
				observations = metropole();
			} else if (dataset === 'DS_RP_TD_POPULATION_AGESEX_PRINC') {
				observations = geos.map((geo) => obs({ GEO: `2026-${geo}`, SEX: '_T', AGE: 'Y30' }, 10));
			} else {
				observations = [obs({ SEX: '_T', AGE: 'Y_GE65', PCS: '7' }, 5)];
			}

			return new Response(
				JSON.stringify({
					observations: observations.map((observation) => ({
						dimensions: observation.dimensions,
						measures: { OBS_VALUE_NIVEAU: { value: observation.value } }
					})),
					paging: { count: observations.length }
				})
			);
		});
	}

	it('interroge les treize regions metropolitaines en une requete', async () => {
		const fetcher = fakeMelodi();
		const reference = await loadCensusReference({ fetcher });

		expect(fetcher).toHaveBeenCalledTimes(3);
		expect(Object.keys(reference.regions)).toHaveLength(METROPOLITAN_REGIONS.length);
	});

	it('garde le referentiel une journee, puis le relit', async () => {
		const fetcher = fakeMelodi();
		const now = new Date('2026-09-28T10:00:00.000Z');

		await loadCensusReference({ fetcher, now });
		await loadCensusReference({ fetcher, now: new Date(now.getTime() + 60_000) });
		expect(fetcher).toHaveBeenCalledTimes(3);

		await loadCensusReference({ fetcher, now: new Date(now.getTime() + 25 * 3_600_000) });
		expect(fetcher).toHaveBeenCalledTimes(6);
	});

	it('relit a la demande, meme avec un cache frais', async () => {
		const fetcher = fakeMelodi();

		await loadCensusReference({ fetcher });
		await loadCensusReference({ fetcher, refresh: true });

		expect(fetcher).toHaveBeenCalledTimes(6);
	});
});
