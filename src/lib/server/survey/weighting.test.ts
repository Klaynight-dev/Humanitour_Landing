import { describe, expect, it } from 'vitest';
import {
	DEFAULT_MAX_ITERATIONS,
	DEFAULT_MAX_WEIGHT,
	DEFAULT_MIN_WEIGHT,
	DEFAULT_TOLERANCE,
	DESIGN_EFFECT_ALERT,
	kish,
	normalizeTargets,
	rake,
	weightHistogram,
	type WeightingUnit,
	type WeightingVariable
} from './weighting';

/** Un echantillon, ecrit comme on le lit : « 7 hommes, 3 femmes ». */
function sample(counts: Record<string, number>, questionCode = 'genre'): WeightingUnit[] {
	const units: WeightingUnit[] = [];

	for (const [key, count] of Object.entries(counts)) {
		for (let index = 0; index < count; index += 1) {
			units.push({ id: `${key}-${index}`, modalities: new Map([[questionCode, key]]) });
		}
	}

	return units;
}

function variable(questionCode: string, targets: Record<string, number>): WeightingVariable {
	return { questionCode, targets: new Map(Object.entries(targets)) };
}

/** Part observee d'une modalite, une fois les poids appliques. */
function weightedShare(
	units: readonly WeightingUnit[],
	weights: ReadonlyMap<string, number>,
	questionCode: string,
	modalityKey: string
): number {
	let matching = 0;
	let total = 0;

	for (const unit of units) {
		const weight = weights.get(unit.id) ?? 0;
		if (unit.modalities.get(questionCode) === undefined) continue;
		total += weight;
		if (unit.modalities.get(questionCode) === modalityKey) matching += weight;
	}

	return total === 0 ? 0 : matching / total;
}

describe('normalizeTargets', () => {
	it('ramene a 1 des pourcentages arrondis a la main', () => {
		const normalized = normalizeTargets(
			new Map([
				['a', 49.8],
				['b', 50.4]
			])
		);
		const total = [...normalized.values()].reduce((sum, share) => sum + share, 0);

		expect(total).toBeCloseTo(1, 10);
		expect(normalized.get('a')).toBeCloseTo(0.497, 3);
	});

	it('ecarte les parts nulles, negatives ou illisibles', () => {
		const normalized = normalizeTargets(
			new Map([
				['a', 50],
				['b', 0],
				['c', -10],
				['d', Number.NaN],
				['e', 50]
			])
		);

		expect([...normalized.keys()]).toEqual(['a', 'e']);
	});

	it('rend une table vide quand rien n est saisi, plutot que des parts infinies', () => {
		expect(normalizeTargets(new Map([['a', 0]])).size).toBe(0);
	});
});

describe('rake', () => {
	it('redresse un echantillon desequilibre sur une variable', () => {
		// 70 % d'hommes rencontres pour une population a 50/50.
		const units = sample({ homme: 70, femme: 30 });
		const { weights, diagnostics } = rake(units, [variable('genre', { homme: 0.5, femme: 0.5 })]);

		expect(weightedShare(units, weights, 'genre', 'homme')).toBeCloseTo(0.5, 4);
		expect(diagnostics.converged).toBe(true);
	});

	it('laisse les poids a 1 quand l echantillon est deja conforme', () => {
		const units = sample({ homme: 50, femme: 50 });
		const { weights, diagnostics } = rake(units, [variable('genre', { homme: 0.5, femme: 0.5 })]);

		expect([...weights.values()].every((weight) => Math.abs(weight - 1) < 1e-9)).toBe(true);
		expect(diagnostics.maxDeviation).toBeCloseTo(0, 6);
	});

	it('cale deux variables a la fois', () => {
		const units: WeightingUnit[] = [];
		let index = 0;
		// Les jeunes sont sous-representes, les hommes sur-representes.
		for (const [genre, age, count] of [
			['homme', 'jeune', 10],
			['homme', 'vieux', 50],
			['femme', 'jeune', 5],
			['femme', 'vieux', 35]
		] as const) {
			for (let n = 0; n < count; n += 1) {
				index += 1;
				units.push({
					id: `u${index}`,
					modalities: new Map([
						['genre', genre],
						['age', age]
					])
				});
			}
		}

		const { weights } = rake(units, [
			variable('genre', { homme: 0.5, femme: 0.5 }),
			variable('age', { jeune: 0.4, vieux: 0.6 })
		]);

		expect(weightedShare(units, weights, 'genre', 'homme')).toBeCloseTo(0.5, 2);
		expect(weightedShare(units, weights, 'age', 'jeune')).toBeCloseTo(0.4, 2);
	});

	it('ramene la somme des poids a l effectif : un redresse reste comparable a un brut', () => {
		const units = sample({ homme: 70, femme: 30 });
		const { weights } = rake(units, [variable('genre', { homme: 0.5, femme: 0.5 })]);
		const total = [...weights.values()].reduce((sum, weight) => sum + weight, 0);

		expect(total).toBeCloseTo(units.length, 6);
	});

	it('borne les poids, meme quand la cible l exigerait davantage', () => {
		// Une seule femme pour 99 hommes : atteindre 50/50 demanderait un poids
		// de 99. L'ecretage passe avant la cible.
		const units = sample({ homme: 99, femme: 1 });
		const { weights, diagnostics } = rake(units, [variable('genre', { homme: 0.5, femme: 0.5 })], {
			maxWeight: 5,
			minWeight: 0.2
		});

		expect(Math.max(...weights.values())).toBeLessThanOrEqual(5.001);
		// Et l'ecart residuel est rendu, pas efface.
		expect(diagnostics.converged).toBe(false);
		expect(diagnostics.maxDeviation).toBeGreaterThan(0.01);
	});

	it('signale une cible que personne ne peut porter', () => {
		const units = sample({ homme: 50, femme: 50 });
		const { diagnostics } = rake(units, [
			variable('genre', { homme: 0.45, femme: 0.45, autre: 0.1 })
		]);

		expect(diagnostics.warnings).toHaveLength(1);
		expect(diagnostics.warnings[0]?.modalityKey).toBe('autre');
	});

	it('garde un repondant qui n a pas repondu a la question de calage', () => {
		const units: WeightingUnit[] = [
			...sample({ homme: 3, femme: 1 }),
			{ id: 'sans-reponse', modalities: new Map() }
		];

		const { weights } = rake(units, [variable('genre', { homme: 0.5, femme: 0.5 })]);

		expect(weights.get('sans-reponse')).toBeGreaterThan(0);
		expect(weights.size).toBe(units.length);
	});

	it('rend la taille effective, toujours inferieure a l effectif des qu on pondere', () => {
		const units = sample({ homme: 70, femme: 30 });
		const { diagnostics } = rake(units, [variable('genre', { homme: 0.5, femme: 0.5 })]);

		expect(diagnostics.effectiveSampleSize).toBeLessThan(units.length);
		expect(diagnostics.effectiveSampleSize).toBeGreaterThan(0);
	});

	it('ne touche a rien sans variable de calage', () => {
		const units = sample({ homme: 2, femme: 2 });
		const { weights, diagnostics } = rake(units, []);

		expect([...weights.values()]).toEqual([1, 1, 1, 1]);
		expect(diagnostics.effectiveSampleSize).toBe(4);
	});

	it('supporte un echantillon vide sans diviser par zero', () => {
		const { weights, diagnostics } = rake([], [variable('genre', { homme: 1 })]);

		expect(weights.size).toBe(0);
		expect(diagnostics.respondents).toBe(0);
		expect(diagnostics.effectiveSampleSize).toBe(0);
	});

	it('ignore une modalite observee mais absente des cibles', () => {
		const units = sample({ homme: 40, femme: 40, autre: 20 });
		const { weights } = rake(units, [variable('genre', { homme: 0.5, femme: 0.5 })]);

		// Les « autre » ne sont pas effaces : ils gardent un poids reel.
		expect(weights.get('autre-0')).toBeGreaterThan(0);
	});

	it('applique par defaut epsilon = 0,0001 et les bornes [0,25 ; 3,5]', () => {
		const { diagnostics } = rake(sample({ homme: 70, femme: 30 }), [
			variable('genre', { homme: 0.5, femme: 0.5 })
		]);

		expect(diagnostics.settings).toEqual({
			tolerance: DEFAULT_TOLERANCE,
			maxIterations: DEFAULT_MAX_ITERATIONS,
			trim: true,
			minWeight: DEFAULT_MIN_WEIGHT,
			maxWeight: DEFAULT_MAX_WEIGHT
		});
		expect(DEFAULT_TOLERANCE).toBe(0.0001);
		expect([DEFAULT_MIN_WEIGHT, DEFAULT_MAX_WEIGHT]).toEqual([0.25, 3.5]);
	});

	it('sans troncature, atteint la cible meme quand elle exige un poids extreme', () => {
		// Une femme pour 99 hommes : le raking pur lui donne 50 fois le poids moyen.
		const units = sample({ homme: 99, femme: 1 });
		const { weights, diagnostics } = rake(units, [variable('genre', { homme: 0.5, femme: 0.5 })], {
			trim: false
		});

		expect(weightedShare(units, weights, 'genre', 'femme')).toBeCloseTo(0.5, 6);
		expect(weights.get('femme-0')).toBeCloseTo(50, 6);
		expect(diagnostics.converged).toBe(true);
		expect(diagnostics.atBounds).toBe(0);
	});

	it('compte les repondants colles a une borne', () => {
		const units = sample({ homme: 99, femme: 1 });
		const { diagnostics } = rake(units, [variable('genre', { homme: 0.5, femme: 0.5 })], {
			minWeight: 0.25,
			maxWeight: 3.5
		});

		// La femme est au plafond ; les hommes, eux, restent au-dessus du plancher.
		expect(diagnostics.atBounds).toBe(1);
	});

	it('garde des poids strictement positifs, comme l exige la distance exponentielle', () => {
		const units = sample({ homme: 90, femme: 10 });
		const { weights } = rake(units, [variable('genre', { homme: 0.3, femme: 0.7 })], {
			trim: false
		});

		expect(Math.min(...weights.values())).toBeGreaterThan(0);
	});

	it('trace l ecart restant a chaque iteration, jusqu a l arret', () => {
		const units: WeightingUnit[] = [];
		for (let n = 0; n < 200; n += 1) {
			units.push({
				id: `u${n}`,
				modalities: new Map([
					['genre', n % 3 === 0 ? 'femme' : 'homme'],
					['age', n % 5 === 0 ? 'jeune' : 'vieux']
				])
			});
		}

		const { diagnostics } = rake(units, [
			variable('genre', { homme: 0.5, femme: 0.5 }),
			variable('age', { jeune: 0.4, vieux: 0.6 })
		]);

		expect(diagnostics.history).toHaveLength(diagnostics.iterations);
		expect(diagnostics.history.at(-1)?.maxDeviation).toBe(diagnostics.maxDeviation);
		expect(diagnostics.history.at(-1)!.maxDeviation).toBeLessThanOrEqual(DEFAULT_TOLERANCE);
	});

	it('s arrete au nombre maximal d iterations et le dit', () => {
		const units = sample({ homme: 99, femme: 1 });
		const { diagnostics } = rake(units, [variable('genre', { homme: 0.5, femme: 0.5 })], {
			maxIterations: 3
		});

		expect(diagnostics.iterations).toBe(3);
		expect(diagnostics.history).toHaveLength(3);
		expect(diagnostics.converged).toBe(false);
	});
});

describe('kish', () => {
	it('rend n_eff, Deff = 1 + CV^2 et le rapport des poids, calcules a la main', () => {
		// Poids 0,5 ; 0,5 ; 1,5 ; 1,5 : moyenne 1, variance 0,25, CV = 0,5.
		const metrics = kish([0.5, 0.5, 1.5, 1.5]);

		expect(metrics.effectiveSampleSize).toBeCloseTo(16 / 5, 10);
		expect(metrics.designEffect).toBeCloseTo(1.25, 10);
		expect(metrics.coefficientOfVariation).toBeCloseTo(0.5, 10);
		expect(metrics.weightRatio).toBe(3);
		expect(metrics.minWeight).toBe(0.5);
		expect(metrics.maxWeight).toBe(1.5);
	});

	it('rend un effet de plan de 1 pour des poids egaux', () => {
		const metrics = kish([2, 2, 2]);

		expect(metrics.designEffect).toBeCloseTo(1, 12);
		expect(metrics.coefficientOfVariation).toBeCloseTo(0, 6);
		expect(metrics.effectiveSampleSize).toBeCloseTo(3, 12);
	});

	it('ne donne pas de rapport quand un poids est nul', () => {
		expect(kish([0, 1]).weightRatio).toBeNull();
	});

	it('supporte une liste vide', () => {
		expect(kish([])).toEqual({
			minWeight: 0,
			maxWeight: 0,
			effectiveSampleSize: 0,
			designEffect: 1,
			coefficientOfVariation: 0,
			weightRatio: null
		});
	});

	it('supporte des poids tous nuls sans diviser par zero', () => {
		const metrics = kish([0, 0]);

		expect(metrics.effectiveSampleSize).toBe(0);
		expect(metrics.designEffect).toBe(1);
	});

	it('fixe l alerte d effet de plan a 1,5', () => {
		expect(DESIGN_EFFECT_ALERT).toBe(1.5);
	});
});

describe('weightHistogram', () => {
	it('range chaque poids dans une classe de largeur egale partant de zero', () => {
		const bins = weightHistogram([0.5, 1, 1, 2, 4], 4);

		expect(bins.map((bin) => [bin.from, bin.to, bin.count])).toEqual([
			[0, 1, 1],
			[1, 2, 2],
			[2, 3, 1],
			[3, 4, 1]
		]);
	});

	it('ne perd aucun repondant', () => {
		const weights = Array.from({ length: 97 }, (_, index) => 0.25 + index / 30);
		const bins = weightHistogram(weights);

		expect(bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(97);
	});

	it('rend une liste vide sans poids, et une seule classe pour des poids nuls', () => {
		expect(weightHistogram([])).toEqual([]);
		expect(weightHistogram([1], 0)).toEqual([]);
		expect(weightHistogram([0, 0])).toEqual([{ from: 0, to: 0, count: 2 }]);
	});
});

/**
 * Generateur pseudo-aleatoire deterministe (mulberry32).
 *
 * Un echantillon tire au hasard a chaque execution rendrait un test qui echoue
 * une fois sur mille, impossible a reproduire.
 */
function seeded(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function pick(random: () => number, shares: Record<string, number>): string {
	let draw = random();
	for (const [key, share] of Object.entries(shares)) {
		draw -= share;
		if (draw < 0) return key;
	}
	return Object.keys(shares).at(-1)!;
}

/**
 * Un recrutement en ligne typique : trop de femmes, trop de 18-24 ans, trop de
 * cadres et d Ile-de-France. Les parts de tirage sont inventees pour le test ;
 * les cibles sont des ordres de grandeur du recensement, sans pretention
 * d exactitude, et ne sortent pas de ce fichier.
 */
function biasedOnlineSample(size: number): WeightingUnit[] {
	const random = seeded(2027);
	const units: WeightingUnit[] = [];

	for (let n = 0; n < size; n += 1) {
		units.push({
			id: `r${n}`,
			modalities: new Map([
				['sexe', pick(random, { f: 0.64, h: 0.36 })],
				['age', pick(random, { a18: 0.34, a25: 0.24, a35: 0.2, a50: 0.14, a65: 0.08 })],
				[
					'pcs',
					pick(random, { cadre: 0.38, inter: 0.24, employe: 0.16, ouvrier: 0.06, autre: 0.16 })
				],
				['zone', pick(random, { idf: 0.35, province: 0.65 })]
			])
		});
	}

	return units;
}

const CENSUS_LIKE = [
	variable('sexe', { f: 0.52, h: 0.48 }),
	variable('age', { a18: 0.1, a25: 0.15, a35: 0.24, a50: 0.25, a65: 0.26 }),
	variable('pcs', { cadre: 0.12, inter: 0.16, employe: 0.15, ouvrier: 0.12, autre: 0.45 }),
	variable('zone', { idf: 0.19, province: 0.81 })
];

describe('rake sur un echantillon en ligne biaise', () => {
	it('cale 10 000 repondants sur quatre variables en moins d une seconde', () => {
		const units = biasedOnlineSample(10_000);

		const started = performance.now();
		const { weights, diagnostics } = rake(units, CENSUS_LIKE, { trim: false });
		const elapsed = performance.now() - started;

		expect(diagnostics.converged).toBe(true);
		expect(weightedShare(units, weights, 'age', 'a65')).toBeCloseTo(0.26, 3);
		expect(weightedShare(units, weights, 'zone', 'idf')).toBeCloseTo(0.19, 3);
		expect(elapsed).toBeLessThan(1000);
	});

	it('paie le redressement en precision : Deff au-dessus de 1, n_eff sous n', () => {
		const units = biasedOnlineSample(2_000);
		const { diagnostics } = rake(units, CENSUS_LIKE);

		expect(diagnostics.designEffect).toBeGreaterThan(1);
		expect(diagnostics.effectiveSampleSize).toBeCloseTo(2_000 / diagnostics.designEffect, 6);
		expect(diagnostics.maxWeight).toBeLessThanOrEqual(DEFAULT_MAX_WEIGHT + 1e-9);
		expect(diagnostics.minWeight).toBeGreaterThanOrEqual(DEFAULT_MIN_WEIGHT - 1e-9);
	});
});
