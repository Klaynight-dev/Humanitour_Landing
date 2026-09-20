import { describe, expect, it } from 'vitest';
import { NON_RESPONSE_KEY } from '$lib/shared/questions';
import {
	IdentifyingDataError,
	mapRows,
	suggestMapping,
	type MappableQuestion
} from './mapper';
import { detectIdentifyingColumns, type RowSet } from './identifying';

const PRIORITE: MappableQuestion = {
	code: 'priorite',
	label: 'Quelle est votre priorite ?',
	type: 'single_choice',
	config: {},
	options: [
		{ code: 'sante', label: 'La sante', position: 0, isNonResponse: false },
		{ code: 'ecologie', label: "L'ecologie", position: 1, isNonResponse: false },
		{ code: 'nsp', label: 'Ne se prononce pas', position: 2, isNonResponse: true }
	]
};

const AGE: MappableQuestion = {
	code: 'age',
	label: 'Quel age avez-vous ?',
	type: 'number',
	config: { min: 18, max: 97, bucketSize: 10, bucketStart: 18 },
	options: []
};
describe('detectIdentifyingColumns', () => {
	it('repere les colonnes directement identifiantes', () => {
		const found = detectIdentifyingColumns(['priorite', 'email', 'telephone', 'age']);

		expect(found).toContain('email');
		expect(found).toContain('telephone');
		expect(found).not.toContain('priorite');
	});

	it('repere les variantes courantes', () => {
		expect(detectIdentifyingColumns(['e-mail'])).toHaveLength(1);
		expect(detectIdentifyingColumns(['Courriel'])).toHaveLength(1);
		expect(detectIdentifyingColumns(['Nom'])).toHaveLength(1);
		expect(detectIdentifyingColumns(['date_de_naissance'])).toHaveLength(1);
		expect(detectIdentifyingColumns(['IBAN'])).toHaveLength(1);
	});

	it('ne signale rien sur un fichier propre', () => {
		expect(detectIdentifyingColumns(['priorite', 'region', 'age', 'csp'])).toHaveLength(0);
	});
});

describe('mapRows', () => {
	const rowSet: RowSet = {
		columns: ['priorite', 'age'],
		rows: [
			{ priorite: 'sante', age: '34' },
			{ priorite: 'ecologie', age: '52' }
		]
	};

	it('produit une reponse par ligne acceptee', () => {
		const report = mapRows(rowSet, [PRIORITE, AGE], { priorite: 'priorite', age: 'age' });

		expect(report.total).toBe(2);
		expect(report.accepted).toHaveLength(2);
		expect(report.rejected).toHaveLength(0);
		expect(report.accepted[0]?.answers).toHaveLength(2);
	});

	it('regroupe le nombre dans sa tranche', () => {
		const report = mapRows(rowSet, [AGE], { age: 'age' });
		const answer = report.accepted[0]?.answers[0];

		expect(answer?.modalityKey).toBe('28-37');
		expect(answer?.valueNumber).toBe(34);
	});

	it('traite une cellule vide comme une non-reponse, pas comme un rejet', () => {
		const report = mapRows(
			{ columns: ['priorite'], rows: [{ priorite: '' }] },
			[PRIORITE],
			{ priorite: 'priorite' }
		);

		expect(report.rejected).toHaveLength(0);
		expect(report.accepted[0]?.answers[0]?.modalityKey).toBe(NON_RESPONSE_KEY);
	});

	it('rejette la ligne entiere des qu une colonne est invalide', () => {
		// Importer la moitie d un questionnaire fausserait tous les croisements :
		// le repondant compterait dans une question et pas dans l autre.
		const report = mapRows(
			{ columns: ['priorite', 'age'], rows: [{ priorite: 'conquete spatiale', age: '34' }] },
			[PRIORITE, AGE],
			{ priorite: 'priorite', age: 'age' }
		);

		expect(report.accepted).toHaveLength(0);
		expect(report.rejected).toHaveLength(1);
	});

	it('rend le rejet exploitable : rang, colonne, valeur et motif', () => {
		const report = mapRows(
			{ columns: ['priorite'], rows: [{ priorite: 'sante' }, { priorite: 'inconnue' }] },
			[PRIORITE],
			{ priorite: 'priorite' }
		);

		const rejected = report.rejected[0];
		// Deuxieme soumission du lot, et on numerote a partir de 1.
		expect(rejected?.line).toBe(2);
		expect(rejected?.column).toBe('priorite');
		expect(rejected?.value).toBe('inconnue');
		expect(rejected?.reason).toMatch(/inconnue/i);
	});

	it('tronque une valeur trop longue dans le rapport', () => {
		const report = mapRows(
			{ columns: ['priorite'], rows: [{ priorite: 'x'.repeat(200) }] },
			[PRIORITE],
			{ priorite: 'priorite' }
		);

		expect(report.rejected[0]?.value.length).toBeLessThanOrEqual(60);
	});

	it('ignore une question absente de la correspondance', () => {
		const report = mapRows(rowSet, [PRIORITE, AGE], { priorite: 'priorite' });

		expect(report.accepted[0]?.answers).toHaveLength(1);
	});

	it('refuse tout le lot s il porte une colonne identifiante', () => {
		// Meme non mappee : la colonne ne doit pas entrer.
		expect(() =>
			mapRows(
				{ columns: ['priorite', 'email'], rows: [{ priorite: 'sante', email: 'a@b.fr' }] },
				[PRIORITE],
				{ priorite: 'priorite' }
			)
		).toThrow(IdentifyingDataError);
	});
});

describe('suggestMapping', () => {
	it('associe un champ dont la cle porte le code de la question', () => {
		const mapping = suggestMapping([{ key: 'priorite', label: 'Question 1' }], [PRIORITE]);

		expect(mapping.priorite).toBe('priorite');
	});

	it('associe sur le LIBELLE quand la cle est engendree', () => {
		// Le cas reel : le builder d'Openforms nomme ses champs « champ_<date> »,
		// donc seule la comparaison des libelles peut aboutir.
		const mapping = suggestMapping(
			[{ key: 'champ_m3x9z1_4', label: 'Quelle est votre priorité ?' }],
			[PRIORITE]
		);

		expect(mapping.priorite).toBe('champ_m3x9z1_4');
	});

	it('ignore accents, casse et ponctuation des deux cotes', () => {
		const mapping = suggestMapping(
			[{ key: 'champ_1', label: '  QUEL ÂGE AVEZ-VOUS ???  ' }],
			[AGE]
		);

		expect(mapping.age).toBe('champ_1');
	});

	it('n attribue pas deux fois le meme champ', () => {
		// L'enregistrement refuse les doublons : une proposition qui en produit
		// serait irrecevable telle quelle.
		const jumelle: MappableQuestion = { ...AGE, code: 'priorite', label: 'Quel age avez-vous ?' };
		const mapping = suggestMapping([{ key: 'age', label: 'Quel age avez-vous ?' }], [AGE, jumelle]);

		expect(mapping.age).toBe('age');
		expect(mapping.priorite).toBeUndefined();
	});

	it('ne propose rien quand aucun champ ne correspond', () => {
		const mapping = suggestMapping([{ key: 'champ_9', label: 'Votre commune' }], [PRIORITE]);

		expect(mapping.priorite).toBeUndefined();
	});
});
