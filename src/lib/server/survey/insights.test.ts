import { describe, expect, it } from 'vitest';
import { NON_RESPONSE_KEY, type ModalityDescriptor } from '$shared/questions';
import type { AnswerRow } from './aggregate';
import { buildOutcome, type Axis } from './explore';
import { insightsOf } from './insights';
import { everyone } from './population';

const PRIORITE: readonly ModalityDescriptor[] = [
	{ key: 'pouvoir-achat', label: "Le pouvoir d'achat", isNonResponse: false },
	{ key: 'sante', label: 'La santé', isNonResponse: false },
	{ key: NON_RESPONSE_KEY, label: 'Sans réponse', isNonResponse: true }
];

const AGE: readonly ModalityDescriptor[] = [
	{ key: 'jeunes', label: '18-24 ans', isNonResponse: false },
	{ key: 'anciens', label: '65 ans et plus', isNonResponse: false }
];

/** Dix repondants : six pour le pouvoir d achat, trois pour la sante, un muet. */
const PRIORITE_ROWS: readonly AnswerRow[] = [
	...['r1', 'r2', 'r3', 'r4', 'r5', 'r6'].map((responseId) => ({
		responseId,
		modalityKey: 'pouvoir-achat'
	})),
	...['r7', 'r8', 'r9'].map((responseId) => ({ responseId, modalityKey: 'sante' })),
	{ responseId: 'r10', modalityKey: NON_RESPONSE_KEY }
];

/** Les cinq premiers sont jeunes, les cinq suivants sont anciens. */
const AGE_ROWS: readonly AnswerRow[] = [
	...['r1', 'r2', 'r3', 'r4', 'r5'].map((responseId) => ({ responseId, modalityKey: 'jeunes' })),
	...['r6', 'r7', 'r8', 'r9', 'r10'].map((responseId) => ({
		responseId,
		modalityKey: 'anciens'
	}))
];

const X: Axis = {
	code: 'priorite',
	label: 'Votre priorité',
	modalities: PRIORITE,
	rows: PRIORITE_ROWS
};

const Y: Axis = { code: 'age', label: 'Votre âge', modalities: AGE, rows: AGE_ROWS };

function outcomeFor(y: Axis | null, threshold = 1) {
	return buildOutcome({
		x: y ? Y : X,
		y: y ? X : null,
		population: everyone(10),
		threshold,
		includeNonResponses: true
	});
}

describe('constats d une distribution', () => {
	it('designe la modalite la plus citee et son avance', () => {
		const [dominant] = insightsOf(outcomeFor(null));

		expect(dominant).toMatchObject({
			kind: 'dominant',
			label: "Le pouvoir d'achat",
			count: 6,
			runnerUpLabel: 'La santé',
			leadPoints: 30
		});
	});

	it('compte la non-reponse comme un resultat, pas comme un manque', () => {
		const nonResponse = insightsOf(outcomeFor(null)).find(
			(insight) => insight.kind === 'non-response'
		);

		expect(nonResponse).toMatchObject({ kind: 'non-response', count: 1 });
	});

	it('n ecrit pas de constat sur une non-reponse absente', () => {
		const outcome = buildOutcome({
			x: { ...X, rows: PRIORITE_ROWS.filter((row) => row.modalityKey !== NON_RESPONSE_KEY) },
			y: null,
			population: everyone(9),
			threshold: 1,
			includeNonResponses: true
		});

		expect(insightsOf(outcome).some((insight) => insight.kind === 'non-response')).toBe(false);
	});

	it('n annonce aucune avance quand une seule modalite est publiee', () => {
		const outcome = buildOutcome({
			x: {
				...X,
				modalities: [PRIORITE[0] as ModalityDescriptor],
				rows: PRIORITE_ROWS.filter((row) => row.modalityKey === 'pouvoir-achat')
			},
			y: null,
			population: everyone(6),
			threshold: 1,
			includeNonResponses: true
		});
		const [dominant] = insightsOf(outcome);

		expect(dominant).toMatchObject({ leadPoints: null, runnerUpLabel: null });
	});
});

describe('constats d un croisement', () => {
	it('designe le plus grand ecart entre deux lignes', () => {
		const [gap] = insightsOf(outcomeFor(X));

		// Chez les jeunes, les cinq repondants citent le pouvoir d achat ; chez les
		// anciens, un seul sur cinq.
		expect(gap).toMatchObject({
			kind: 'gap',
			yLabel: "Le pouvoir d'achat",
			highLabel: '18-24 ans',
			lowLabel: '65 ans et plus',
			points: 80
		});
	});

	it('n ecrit rien quand les deux groupes se ressemblent', () => {
		const uniform: Axis = {
			...X,
			rows: [
				...['r1', 'r2', 'r3', 'r4', 'r5'].map((responseId) => ({
					responseId,
					modalityKey: 'pouvoir-achat'
				})),
				...['r6', 'r7', 'r8', 'r9', 'r10'].map((responseId) => ({
					responseId,
					modalityKey: 'pouvoir-achat'
				}))
			]
		};
		const outcome = buildOutcome({
			x: Y,
			y: uniform,
			population: everyone(10),
			threshold: 1,
			includeNonResponses: true
		});

		expect(insightsOf(outcome)).toEqual([]);
	});
});

describe('respect du seuil d anonymat', () => {
	it('n ecrit aucun constat sur une population trop petite', () => {
		const outcome = buildOutcome({
			x: X,
			y: null,
			population: everyone(10),
			threshold: 50,
			includeNonResponses: true
		});

		expect(insightsOf(outcome)).toEqual([]);
	});

	it('ignore les modalites masquees au lieu de les deviner', () => {
		// Seuil a 5 : « pouvoir d achat » (6) passe, « sante » (3) et la
		// non-reponse (1) sont masquees. Aucune des deux ne doit apparaitre, ni en
		// clair ni en creux par une avance calculee contre elles.
		const [dominant, ...rest] = insightsOf(outcomeFor(null, 5));

		expect(dominant).toMatchObject({ label: "Le pouvoir d'achat", leadPoints: null });
		expect(rest).toEqual([]);
	});

	it('n annonce pas d ecart quand une seule ligne est publiee', () => {
		const outcome = buildOutcome({
			x: Y,
			y: X,
			population: everyone(10),
			threshold: 5,
			includeNonResponses: true
		});

		// Chaque case du croisement porte au plus 5 repondants : rien ne subsiste
		// pour comparer deux lignes entre elles.
		expect(insightsOf(outcome).some((insight) => insight.kind === 'gap')).toBe(false);
	});
});
