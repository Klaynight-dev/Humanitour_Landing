import { describe, expect, it, vi } from 'vitest';
import { dataUrl, fetchObservations, MelodiError, MELODI_URL } from './melodi';

function observation(age: string, value: number | null) {
	return {
		dimensions: { GEO: '2026-FRANCE-FM', SEX: '_T', AGE: age, TIME_PERIOD: '2023' },
		measures: { OBS_VALUE_NIVEAU: { value } }
	};
}

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

describe('dataUrl', () => {
	it('repete le parametre pour plusieurs valeurs et demande le total', () => {
		const url = new URL(dataUrl('DS_X', { GEO: ['REG-11', 'REG-53'], SEX: ['_T'] }, 2));

		expect(`${url.origin}${url.pathname}`).toBe(`${MELODI_URL}/data/DS_X`);
		expect(url.searchParams.getAll('GEO')).toEqual(['REG-11', 'REG-53']);
		expect(url.searchParams.get('SEX')).toBe('_T');
		expect(url.searchParams.get('totalCount')).toBe('TRUE');
		expect(url.searchParams.get('page')).toBe('2');
	});
});

describe('fetchObservations', () => {
	it('lit la mesure en niveau et ecarte les cases sans valeur', async () => {
		const fetcher = vi.fn(async () =>
			jsonResponse({
				observations: [observation('Y18', 100), observation('Y19', null)],
				paging: { count: 2 }
			})
		);

		const observations = await fetchObservations('DS_X', { GEO: ['FRANCE-FM'] }, fetcher);

		expect(observations).toEqual([
			{
				dimensions: { GEO: '2026-FRANCE-FM', SEX: '_T', AGE: 'Y18', TIME_PERIOD: '2023' },
				value: 100
			}
		]);
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it('suit la pagination tant que le total annonce n est pas atteint', async () => {
		const full = Array.from({ length: 10_000 }, () => observation('Y30', 1));
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse({ observations: full, paging: { count: 10_001 } }))
			.mockResolvedValueOnce(
				jsonResponse({ observations: [observation('Y31', 2)], paging: { count: 10_001 } })
			);

		const observations = await fetchObservations('DS_X', {}, fetcher);

		expect(observations).toHaveLength(10_001);
		expect(new URL(fetcher.mock.calls[1]![0] as string).searchParams.get('page')).toBe('2');
	});

	it('s arrete sur une page pleine quand le total est atteint', async () => {
		const full = Array.from({ length: 10_000 }, () => observation('Y30', 1));
		const fetcher = vi.fn(async () => jsonResponse({ observations: full, paging: { count: 10_000 } }));

		await fetchObservations('DS_X', {}, fetcher);

		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it('refuse un filtre qui ferait parcourir des dizaines de pages', async () => {
		const full = Array.from({ length: 10_000 }, () => observation('Y30', 1));
		const fetcher = vi.fn(async () =>
			jsonResponse({ observations: full, paging: { count: 10_000_000 } })
		);

		await expect(fetchObservations('DS_X', {}, fetcher)).rejects.toThrow(/trop large/);
		expect(fetcher).toHaveBeenCalledTimes(20);
	});

	it('explique un quota depasse', async () => {
		const fetcher = vi.fn(async () => jsonResponse({}, 429));

		await expect(fetchObservations('DS_X', {}, fetcher)).rejects.toThrow(/réessayez dans une minute/);
	});

	it('rapporte un statut d erreur', async () => {
		const fetcher = vi.fn(async () => jsonResponse({}, 503));

		await expect(fetchObservations('DS_X', {}, fetcher)).rejects.toThrow(/a répondu 503/);
	});

	it('rapporte une reponse illisible', async () => {
		const fetcher = vi.fn(async () => new Response('<html>', { status: 200 }));

		await expect(fetchObservations('DS_X', {}, fetcher)).rejects.toBeInstanceOf(MelodiError);
	});

	it('rapporte un reseau coupe ou un delai depasse', async () => {
		const timeout = new Error('trop long');
		timeout.name = 'TimeoutError';

		await expect(
			fetchObservations('DS_X', {}, vi.fn().mockRejectedValue(timeout))
		).rejects.toThrow(/délai dépassé/);
		await expect(
			fetchObservations('DS_X', {}, vi.fn().mockRejectedValue(new Error('ECONNRESET')))
		).rejects.toThrow(/ECONNRESET/);
		await expect(fetchObservations('DS_X', {}, vi.fn().mockRejectedValue('?'))).rejects.toThrow(
			/erreur réseau/
		);
	});
});
