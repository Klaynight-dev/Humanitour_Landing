import { describe, expect, it } from 'vitest';
import {
	everyone,
	isTooSmall,
	matchClauses,
	restrictTo,
	within,
	type FilterableQuestion
} from './population';

const QUESTIONS: FilterableQuestion[] = [
	{ id: 'q-region', code: 'region', label: 'Votre region' },
	{ id: 'q-age', code: 'age', label: 'Votre age' }
];

describe('matchClauses', () => {
	it('resout une clause vers sa question', () => {
		const { applied, dropped } = matchClauses(QUESTIONS, [
			{ questionCode: 'region', modalityKeys: ['bre'] }
		]);

		expect(applied).toEqual([
			{
				questionCode: 'region',
				questionId: 'q-region',
				questionLabel: 'Votre region',
				modalityKeys: ['bre']
			}
		]);
		expect(dropped).toEqual([]);
	});

	it('signale une clause dont la question a disparu au lieu de l ignorer', () => {
		const { applied, dropped } = matchClauses(QUESTIONS, [
			{ questionCode: 'csp', modalityKeys: ['cadre'] }
		]);

		expect(applied).toEqual([]);
		expect(dropped).toHaveLength(1);
		expect(dropped[0]?.questionCode).toBe('csp');
	});

	it('resout ce qui peut l etre et signale le reste', () => {
		const { applied, dropped } = matchClauses(QUESTIONS, [
			{ questionCode: 'region', modalityKeys: ['bre'] },
			{ questionCode: 'inconnue', modalityKeys: ['x'] }
		]);

		expect(applied).toHaveLength(1);
		expect(dropped).toHaveLength(1);
	});
});

describe('everyone', () => {
	it('accepte tout repondant, sans test de nullite a ecrire ailleurs', () => {
		const population = everyone(1000);

		expect(population.includes('nimporte-qui')).toBe(true);
		expect(population.size).toBe(1000);
		expect(population.restricted).toBe(false);
	});
});

describe('restrictTo', () => {
	it('croise deux clauses en ET', () => {
		const population = restrictTo(1000, [new Set(['r1', 'r2', 'r3']), new Set(['r2', 'r3', 'r4'])]);

		expect(population.includes('r2')).toBe(true);
		expect(population.includes('r1')).toBe(false);
		expect(population.size).toBe(2);
		expect(population.restricted).toBe(true);
	});

	it('donne le meme resultat quel que soit l ordre des clauses', () => {
		const a = new Set(['r1', 'r2', 'r3', 'r4']);
		const b = new Set(['r3', 'r4']);

		expect(restrictTo(10, [a, b]).size).toBe(restrictTo(10, [b, a]).size);
	});

	it('rend une population vide quand les clauses ne se recoupent pas', () => {
		const population = restrictTo(1000, [new Set(['r1']), new Set(['r2'])]);

		expect(population.size).toBe(0);
		expect(population.includes('r1')).toBe(false);
	});

	it('rend une population vide quand il n y a aucune clause a croiser', () => {
		// Un filtre demande mais introuvable ne doit pas elargir la population a
		// tout le monde : ce serait repondre a une autre question que celle posee.
		expect(restrictTo(1000, []).size).toBe(0);
	});

	it('garde le total de l enquete pour que la restriction se lise', () => {
		expect(restrictTo(1000, [new Set(['r1', 'r2'])]).total).toBe(1000);
	});
});

describe('isTooSmall', () => {
	it('arrete la publication sous le seuil', () => {
		expect(isTooSmall(restrictTo(1000, [new Set(['r1', 'r2', 'r3'])]), 5)).toBe(true);
	});

	it('laisse passer une population exactement au seuil', () => {
		const five = new Set(['r1', 'r2', 'r3', 'r4', 'r5']);

		expect(isTooSmall(restrictTo(1000, [five]), 5)).toBe(false);
	});

	it('vaut aussi pour l enquete entiere, sans exception', () => {
		expect(isTooSmall(everyone(3), 5)).toBe(true);
	});
});

describe('within', () => {
	const rows = [
		{ responseId: 'r1', modalityKey: 'a' },
		{ responseId: 'r2', modalityKey: 'b' },
		{ responseId: 'r3', modalityKey: 'a' }
	];

	it('ne garde que les lignes de la population', () => {
		const population = restrictTo(3, [new Set(['r1', 'r3'])]);

		expect(within(rows, population)).toEqual([
			{ responseId: 'r1', modalityKey: 'a' },
			{ responseId: 'r3', modalityKey: 'a' }
		]);
	});

	it('laisse tout passer sans filtre', () => {
		expect(within(rows, everyone(3))).toHaveLength(3);
	});
});
