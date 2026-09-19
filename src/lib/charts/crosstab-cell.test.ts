import { describe, expect, it } from 'vitest';
import type { ModalityDescriptor } from '$shared/questions';
import type { AnswerRow } from '$lib/server/survey/aggregate';
import { buildOutcome, type Axis } from '$lib/server/survey/explore';
import { everyone } from '$lib/server/survey/population';
import { maxCellValue, parseCellBasis, readCell } from './crosstab-cell';

const PRIORITE: readonly ModalityDescriptor[] = [
	{ key: 'achat', label: "Le pouvoir d'achat", isNonResponse: false },
	{ key: 'sante', label: 'La santé', isNonResponse: false }
];

const REGION: readonly ModalityDescriptor[] = [
	{ key: 'bre', label: 'Bretagne', isNonResponse: false },
	{ key: 'nor', label: 'Normandie', isNonResponse: false }
];

/**
 * Dix repondants, repartis pour que les trois lectures donnent trois chiffres
 * differents sur la meme case :
 *
 *            Bretagne   Normandie   total
 *   achat       3           1         4
 *   sante       1           5         6
 *   total       4           6        10
 */
const PRIORITE_ROWS: readonly AnswerRow[] = [
	...['r1', 'r2', 'r3', 'r4'].map((responseId) => ({ responseId, modalityKey: 'achat' })),
	...['r5', 'r6', 'r7', 'r8', 'r9', 'r10'].map((responseId) => ({
		responseId,
		modalityKey: 'sante'
	}))
];

const REGION_ROWS: readonly AnswerRow[] = [
	...['r1', 'r2', 'r3', 'r5'].map((responseId) => ({ responseId, modalityKey: 'bre' })),
	...['r4', 'r6', 'r7', 'r8', 'r9', 'r10'].map((responseId) => ({
		responseId,
		modalityKey: 'nor'
	}))
];

const X: Axis = { code: 'priorite', label: 'Priorité', modalities: PRIORITE, rows: PRIORITE_ROWS };
const Y: Axis = { code: 'region', label: 'Région', modalities: REGION, rows: REGION_ROWS };

function table(threshold = 1) {
	const outcome = buildOutcome({
		x: X,
		y: Y,
		population: everyone(10),
		threshold,
		includeNonResponses: true
	});
	if (outcome.kind !== 'crosstab') throw new Error('croisement attendu');
	return outcome.crosstab;
}

describe('readCell', () => {
	it('lit en ligne : la part au sein de la modalite de la question', () => {
		// 3 Bretons parmi les 4 qui citent le pouvoir d achat.
		expect(readCell(table(), 'achat', 'bre', 'ligne').value).toBeCloseTo(0.75, 4);
	});

	it('lit en colonne : la part au sein de la modalite croisee', () => {
		// 3 « pouvoir d achat » parmi les 4 Bretons.
		expect(readCell(table(), 'achat', 'bre', 'colonne').value).toBeCloseTo(0.75, 4);
	});

	it('lit sur le total : la part de l echantillon entier', () => {
		// 3 repondants sur 10 sont bretons ET citent le pouvoir d achat.
		expect(readCell(table(), 'achat', 'bre', 'total').value).toBeCloseTo(0.3, 4);
	});

	it('donne trois chiffres differents sur une meme case', () => {
		const ligne = readCell(table(), 'sante', 'nor', 'ligne').value;
		const colonne = readCell(table(), 'sante', 'nor', 'colonne').value;
		const total = readCell(table(), 'sante', 'nor', 'total').value;

		// 5 sur 6 en ligne, 5 sur 6 en colonne, 5 sur 10 au total.
		expect(total).not.toBeCloseTo(ligne ?? 0, 4);
		expect(new Set([ligne, colonne, total]).size).toBeGreaterThan(1);
	});

	it('rend l effectif brut sans le diviser', () => {
		const reading = readCell(table(), 'achat', 'bre', 'effectif');

		expect(reading.value).toBe(3);
		expect(reading.text).toBe('3');
	});

	it('garde une case masquee masquee, quelle que soit la lecture', () => {
		// Au seuil de 5, seule la case a 5 repondants survit.
		for (const basis of ['ligne', 'colonne', 'total', 'effectif'] as const) {
			const reading = readCell(table(5), 'achat', 'nor', basis);

			expect(reading.suppressed).toBe(true);
			expect(reading.value).toBeNull();
			expect(reading.text).toBe('—');
		}
	});

	it('ne divise pas par zero', () => {
		expect(readCell(table(), 'achat', 'inexistante', 'colonne').suppressed).toBe(true);
	});
});

describe('maxCellValue', () => {
	it('donne l echelle des couleurs sur les seules cases publiees', () => {
		// En lecture par effectif, la plus grande case publiee vaut 5.
		expect(maxCellValue(table(), 'effectif')).toBe(5);
	});

	it('ne compte pas les cases masquees dans l echelle', () => {
		// Au seuil de 6, aucune case ne passe. La suppression secondaire emporte
		// meme la case a 5 : seule publiee de sa ligne, elle se retrouverait par
		// soustraction du total. L echelle vaut donc zero, et aucune couleur ne
		// suggere une intensite que le tableau ne publie pas.
		expect(maxCellValue(table(6), 'effectif')).toBe(0);
	});

	it('se cale sur la plus grande case publiee, pas sur le total', () => {
		// 5 est la plus grande case ; les totaux de ligne et de colonne, eux,
		// montent plus haut et n entrent pas dans l echelle.
		expect(maxCellValue(table(), 'effectif')).toBe(5);
		expect(maxCellValue(table(), 'ligne')).toBeLessThanOrEqual(1);
	});
});

describe('parseCellBasis', () => {
	it('accepte les quatre lectures', () => {
		expect(parseCellBasis('ligne')).toBe('ligne');
		expect(parseCellBasis('colonne')).toBe('colonne');
		expect(parseCellBasis('total')).toBe('total');
		expect(parseCellBasis('effectif')).toBe('effectif');
	});

	it('ignore une valeur inconnue plutot que de casser le lien', () => {
		expect(parseCellBasis('nimporte-quoi')).toBeNull();
		expect(parseCellBasis(null)).toBeNull();
	});
});
