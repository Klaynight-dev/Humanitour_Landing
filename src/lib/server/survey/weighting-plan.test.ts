import { describe, expect, it } from 'vitest';
import { NON_RESPONSE_KEY } from '$lib/shared/questions';
import { rake } from './weighting';
import {
	buildUnits,
	canCalibrateOn,
	describeWeighting,
	marginReport,
	parseTargetsForm,
	readDiagnostics,
	readVariables,
	targetField,
	toWeightingVariables,
	type CalibrationQuestion
} from './weighting-plan';

const SEXE: CalibrationQuestion = {
	code: 'sexe',
	label: 'Sexe',
	modalities: [
		{ key: 'f', label: 'Femme', isNonResponse: false },
		{ key: 'h', label: 'Homme', isNonResponse: false },
		{ key: NON_RESPONSE_KEY, label: 'Sans réponse', isNonResponse: true }
	]
};

const AGE: CalibrationQuestion = {
	code: 'age',
	label: 'Âge',
	modalities: [
		{ key: 'jeune', label: 'Moins de 35 ans', isNonResponse: false },
		{ key: 'vieux', label: '35 ans et plus', isNonResponse: false }
	]
};

function formWith(entries: Record<string, string | string[]>): FormData {
	const form = new FormData();
	for (const [key, value] of Object.entries(entries)) {
		for (const item of Array.isArray(value) ? value : [value]) form.append(key, item);
	}
	return form;
}

describe('canCalibrateOn', () => {
	it('accepte une question a choix unique', () => {
		expect(canCalibrateOn('single_choice')).toBe(true);
	});

	it('refuse le choix multiple : une personne tomberait dans plusieurs cases', () => {
		expect(canCalibrateOn('multiple_choice')).toBe(false);
	});

	it('refuse un type inconnu', () => {
		expect(canCalibrateOn('inexistant')).toBe(false);
	});
});

describe('parseTargetsForm', () => {
	it('lit des pourcentages a virgule et les ecrit normalises', () => {
		const parsed = parseTargetsForm(
			formWith({
				variable: 'sexe',
				[targetField('sexe', 'f')]: '51,6',
				[targetField('sexe', 'h')]: '48,3 %'
			}),
			[SEXE, AGE]
		);

		expect(parsed.ok).toBe(true);
		if (!parsed.ok) return;
		expect(parsed.variables).toHaveLength(1);
		const targets = parsed.variables[0]!.targets;
		expect(targets.f! + targets.h!).toBeCloseTo(1, 9);
		expect(targets.f).toBeCloseTo(51.6 / 99.9, 9);
	});

	it('ignore une question non cochee, meme si ses cibles sont remplies', () => {
		const parsed = parseTargetsForm(
			formWith({
				variable: 'sexe',
				[targetField('sexe', 'f')]: '50',
				[targetField('sexe', 'h')]: '50',
				[targetField('age', 'jeune')]: '10'
			}),
			[SEXE, AGE]
		);

		expect(parsed.ok && parsed.variables.map((variable) => variable.questionCode)).toEqual([
			'sexe'
		]);
	});

	it('refuse une somme qui n est pas un arrondi, plutot que de normaliser en silence', () => {
		const parsed = parseTargetsForm(
			formWith({
				variable: 'age',
				[targetField('age', 'jeune')]: '30',
				[targetField('age', 'vieux')]: '57'
			}),
			[AGE]
		);

		expect(parsed.ok).toBe(false);
		if (parsed.ok) return;
		expect(parsed.message).toContain('87 %');
	});

	it('refuse une valeur qui n est pas un pourcentage', () => {
		const parsed = parseTargetsForm(
			formWith({
				variable: 'age',
				[targetField('age', 'jeune')]: 'beaucoup',
				[targetField('age', 'vieux')]: '50'
			}),
			[AGE]
		);

		expect(parsed.ok).toBe(false);
	});

	it('exige au moins une variable', () => {
		expect(parseTargetsForm(formWith({}), [SEXE]).ok).toBe(false);
	});

	it('ne propose jamais de cible pour la non-reponse', () => {
		const parsed = parseTargetsForm(
			formWith({
				variable: 'sexe',
				[targetField('sexe', 'f')]: '50',
				[targetField('sexe', 'h')]: '50',
				[targetField('sexe', NON_RESPONSE_KEY)]: '20'
			}),
			[SEXE]
		);

		expect(parsed.ok && Object.keys(parsed.variables[0]!.targets)).toEqual(['f', 'h']);
	});
});

describe('buildUnits', () => {
	it('garde les repondants sans reponse, sans modalite pour la variable', () => {
		const units = buildUnits(
			['a', 'b'],
			[{ responseId: 'a', questionCode: 'sexe', modalityKey: 'f' }]
		);

		expect(units).toHaveLength(2);
		expect(units.find((unit) => unit.id === 'b')?.modalities.size).toBe(0);
	});

	it('ne range pas la non-reponse dans une case de calage', () => {
		const units = buildUnits(
			['a'],
			[{ responseId: 'a', questionCode: 'sexe', modalityKey: NON_RESPONSE_KEY }]
		);

		expect(units[0]?.modalities.has('sexe')).toBe(false);
	});
});

describe('un calage de bout en bout', () => {
	it('rejoint la cible, et le rapport le montre modalite par modalite', () => {
		// Echantillon a 75 % de femmes, population a 50 %.
		const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
		const answers = ids.map((id, index) => ({
			responseId: id,
			questionCode: 'sexe',
			modalityKey: index < 6 ? 'f' : 'h'
		}));
		const units = buildUnits(ids, answers);
		const stored = [{ questionCode: 'sexe', targets: { f: 0.5, h: 0.5 } }];

		const { weights } = rake(units, toWeightingVariables(stored), { maxWeight: 10 });
		const { rows } = marginReport(units, weights, 'sexe', SEXE.modalities, stored[0]!.targets);

		const femmes = rows.find((row) => row.key === 'f');
		expect(femmes?.observed).toBeCloseTo(0.75, 6);
		expect(femmes?.target).toBe(0.5);
		expect(femmes?.weighted).toBeCloseTo(0.5, 3);
	});
});

describe('lecture des colonnes JSON', () => {
	it('rend une liste vide pour un contenu illisible', () => {
		expect(readVariables({ nimporte: 'quoi' })).toEqual([]);
	});

	it('rend null pour un diagnostic absent', () => {
		expect(readDiagnostics(null)).toBeNull();
	});
});

describe('marginReport', () => {
	const units = buildUnits(
		['a', 'b', 'c', 'd'],
		[
			{ responseId: 'a', questionCode: 'sexe', modalityKey: 'f' },
			{ responseId: 'b', questionCode: 'sexe', modalityKey: 'f' },
			{ responseId: 'c', questionCode: 'sexe', modalityKey: 'h' }
		]
	);

	it('compte a part les repondants sans modalite, sans les meler aux parts', () => {
		const { rows, unknown } = marginReport(units, null, 'sexe', SEXE.modalities, null);

		expect(unknown).toBe(1);
		// Trois repondants classes, pas quatre : deux femmes sur trois.
		expect(rows.find((row) => row.key === 'f')?.observed).toBeCloseTo(2 / 3, 6);
	});

	it('ne donne aucune part redressee tant qu il n y a pas de poids', () => {
		const { rows } = marginReport(units, null, 'sexe', SEXE.modalities, null);

		expect(rows.every((row) => row.weighted === null)).toBe(true);
	});

	it('ne donne aucune cible quand elle n est pas fixee', () => {
		const { rows } = marginReport(units, null, 'sexe', SEXE.modalities, null);

		expect(rows.every((row) => row.target === null)).toBe(true);
	});

	it('ne rend pas de part observee quand personne n est classe', () => {
		const vides = buildUnits(['a'], []);
		const { rows, unknown } = marginReport(vides, null, 'sexe', SEXE.modalities, null);

		expect(unknown).toBe(1);
		expect(rows.every((row) => row.observed === null)).toBe(true);
	});

	it('n inscrit pas la non-reponse parmi les lignes de calage', () => {
		const { rows } = marginReport(units, null, 'sexe', SEXE.modalities, null);

		expect(rows.map((row) => row.key)).not.toContain(NON_RESPONSE_KEY);
	});
});

describe('describeWeighting', () => {
	const computedAt = new Date('2026-09-20T10:00:00.000Z');
	const diagnostics = {
		iterations: 12,
		converged: true,
		maxDeviation: 0.0004,
		minWeight: 0.61,
		maxWeight: 2.4,
		effectiveSampleSize: 712.5,
		respondents: 985,
		warnings: []
	};

	it('rend les variables en libelles lisibles', () => {
		const description = describeWeighting(
			{
				version: 2,
				computedAt,
				source: 'INSEE, recensement 2021',
				variables: [{ questionCode: 'sexe', targets: { f: 0.52, h: 0.48 } }],
				diagnostics
			},
			[SEXE, AGE]
		);

		expect(description.variables).toEqual([
			{
				code: 'sexe',
				label: 'Sexe',
				targets: [
					{ key: 'f', label: 'Femme', share: 0.52 },
					{ key: 'h', label: 'Homme', share: 0.48 }
				]
			}
		]);
	});

	it('garde la version, la date et la source telles quelles', () => {
		const description = describeWeighting(
			{ version: 3, computedAt, source: null, variables: [], diagnostics: null },
			[SEXE]
		);

		expect(description.version).toBe(3);
		expect(description.computedAt).toBe(computedAt);
		expect(description.source).toBeNull();
	});

	it('retombe sur le code quand la question a disparu de l enquete', () => {
		const description = describeWeighting(
			{
				version: 1,
				computedAt,
				source: null,
				variables: [{ questionCode: 'retiree', targets: { x: 1 } }],
				diagnostics: null
			},
			[SEXE]
		);

		expect(description.variables[0]?.label).toBe('retiree');
		expect(description.variables[0]?.targets[0]?.label).toBe('x');
	});

	it('retombe sur la cle quand une modalite a disparu', () => {
		const description = describeWeighting(
			{
				version: 1,
				computedAt,
				source: null,
				variables: [{ questionCode: 'sexe', targets: { autre: 1 } }],
				diagnostics: null
			},
			[SEXE]
		);

		expect(description.variables[0]?.targets[0]?.label).toBe('autre');
	});

	it('publie les diagnostics sans le detail interne des iterations', () => {
		const description = describeWeighting(
			{ version: 1, computedAt, source: null, variables: [], diagnostics },
			[SEXE]
		);

		expect(description.diagnostics).toEqual({
			converged: true,
			maxDeviation: 0.0004,
			minWeight: 0.61,
			maxWeight: 2.4,
			effectiveSampleSize: 712.5,
			respondents: 985
		});
	});

	it('laisse les diagnostics absents quand il n y en a pas', () => {
		const description = describeWeighting(
			{ version: 1, computedAt, source: null, variables: [], diagnostics: null },
			[SEXE]
		);

		expect(description.diagnostics).toBeNull();
	});
});
