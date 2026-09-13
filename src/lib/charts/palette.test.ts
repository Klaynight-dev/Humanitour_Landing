import { describe, expect, it } from 'vitest';
import {
	ALL_PAIRS_MAX,
	ALL_PAIRS_SAFE,
	CATEGORICAL,
	colorFor,
	exceedsPalette,
	NON_RESPONSE_COLOR,
	SEQUENTIAL,
	sequentialStep
} from './palette';

describe('palette categorielle', () => {
	it('expose des teintes distinctes', () => {
		expect(new Set(CATEGORICAL).size).toBe(CATEGORICAL.length);
	});

	it('commence par le corail de la marque', () => {
		expect(CATEGORICAL[0]).toBe('#FF5757');
	});

	it('reserve le gris de non-reponse : il n est jamais un slot categoriel', () => {
		expect(CATEGORICAL).not.toContain(NON_RESPONSE_COLOR);
	});

	it('plafonne les formes ou toutes les paires se cotoient', () => {
		expect(ALL_PAIRS_SAFE).toHaveLength(ALL_PAIRS_MAX);
	});
});

describe('colorFor', () => {
	it('attribue le slot correspondant a la position', () => {
		expect(colorFor(0)).toBe(CATEGORICAL[0]);
		expect(colorFor(2)).toBe(CATEGORICAL[2]);
	});

	it('donne la couleur reservee a la non-reponse, avant toute autre regle', () => {
		expect(colorFor(0, { isNonResponse: true })).toBe(NON_RESPONSE_COLOR);
		expect(colorFor(0, { isNonResponse: true, override: '#123456' })).toBe(NON_RESPONSE_COLOR);
	});

	it('respecte une couleur imposee, pour les nuances politiques conventionnelles', () => {
		expect(colorFor(0, { override: '#123456' })).toBe('#123456');
	});

	it('ne cycle pas silencieusement au-dela de la palette', () => {
		// Repeter les couleurs ferait lire deux modalites differentes comme une.
		expect(colorFor(CATEGORICAL.length)).toBe(NON_RESPONSE_COLOR);
	});
});

describe('exceedsPalette', () => {
	it('signale un nombre de modalites que la palette ne distingue plus', () => {
		expect(exceedsPalette(CATEGORICAL.length)).toBe(false);
		expect(exceedsPalette(CATEGORICAL.length + 1)).toBe(true);
	});
});

describe('sequentialStep', () => {
	it('rend le pas le plus clair pour zero ou moins', () => {
		expect(sequentialStep(0)).toBe(SEQUENTIAL[0]);
		expect(sequentialStep(-1)).toBe(SEQUENTIAL[0]);
	});

	it('rend le pas le plus fonce au maximum', () => {
		expect(sequentialStep(1)).toBe(SEQUENTIAL.at(-1));
	});

	it('progresse avec la valeur', () => {
		const low = SEQUENTIAL.indexOf(sequentialStep(0.2));
		const high = SEQUENTIAL.indexOf(sequentialStep(0.8));

		expect(high).toBeGreaterThan(low);
	});

	it('resiste a une valeur invalide', () => {
		expect(sequentialStep(Number.NaN)).toBe(SEQUENTIAL[0]);
	});
});
