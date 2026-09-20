import { describe, expect, it } from 'vitest';
import { normalizeTargets, rake, type WeightingUnit, type WeightingVariable } from './weighting';

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
});
