import { describe, expect, it } from 'vitest';
import { NON_RESPONSE_KEY } from '$lib/shared/questions';
import { csvFormat } from './csv';
import { detectImportFormat, getImportFormat, IMPORT_FORMATS } from './index';
import { jsonFormat } from './json';
import {
	IdentifyingDataError,
	mapRows,
	suggestMapping,
	type ImportableQuestion
} from './mapper';
import { detectIdentifyingColumns, type RowSet } from './types';

function encode(text: string): Uint8Array {
	return new TextEncoder().encode(text);
}

const PRIORITE: ImportableQuestion = {
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

const AGE: ImportableQuestion = {
	code: 'age',
	label: 'Quel age avez-vous ?',
	type: 'number',
	config: { min: 18, max: 97, bucketSize: 10, bucketStart: 18 },
	options: []
};

describe('registre des formats', () => {
	it('expose des cles uniques', () => {
		const keys = IMPORT_FORMATS.map((format) => format.key);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('retourne null pour un format inconnu', () => {
		expect(getImportFormat('parchemin')).toBeNull();
	});

	it('devine le format par extension', () => {
		expect(detectImportFormat('reponses.csv')?.key).toBe('csv');
		expect(detectImportFormat('reponses.xlsx')?.key).toBe('xlsx');
		expect(detectImportFormat('reponses.JSON')?.key).toBe('json');
	});

	it('retombe sur le type MIME quand l extension ne dit rien', () => {
		expect(detectImportFormat('export', 'text/csv')?.key).toBe('csv');
	});

	it('retourne null quand rien ne correspond', () => {
		expect(detectImportFormat('archive.zip', 'application/zip')).toBeNull();
	});
});

describe('csvFormat', () => {
	it('lit un CSV separe par des virgules', () => {
		const result = csvFormat.parse(encode('priorite,age\nsante,34\necologie,52\n'));

		expect(result.columns).toEqual(['priorite', 'age']);
		expect(result.rows).toHaveLength(2);
		expect(result.rows[0]?.priorite).toBe('sante');
	});

	it('lit un CSV separe par des points-virgules', () => {
		// Un tableur configure en francais produit du point-virgule par defaut.
		const result = csvFormat.parse(encode('priorite;age\nsante;34\n'));

		expect(result.columns).toEqual(['priorite', 'age']);
		expect(result.rows[0]?.age).toBe('34');
	});

	it('retire le BOM des exports Windows', () => {
		// Sans cela, la premiere colonne s appellerait "\uFEFFpriorite" et ne
		// correspondrait a aucune question.
		const result = csvFormat.parse(encode('\uFEFFpriorite,age\nsante,34\n'));

		expect(result.columns[0]).toBe('priorite');
	});

	it('coupe les espaces autour des noms de colonnes', () => {
		const result = csvFormat.parse(encode(' priorite , age \nsante,34\n'));

		expect(result.columns).toEqual(['priorite', 'age']);
	});

	it('ignore les lignes vides', () => {
		const result = csvFormat.parse(encode('priorite\nsante\n\n\necologie\n'));

		expect(result.rows).toHaveLength(2);
	});
});

describe('jsonFormat', () => {
	it('lit un tableau d objets', () => {
		const result = jsonFormat.parse(encode('[{"priorite":"sante"},{"priorite":"ecologie"}]'));

		expect(result.columns).toEqual(['priorite']);
		expect(result.rows).toHaveLength(2);
	});

	it('fait l union des cles rencontrees', () => {
		const result = jsonFormat.parse(encode('[{"a":1},{"b":2}]'));

		expect(result.columns.toSorted()).toEqual(['a', 'b']);
	});

	it('refuse autre chose qu un tableau', () => {
		expect(() => jsonFormat.parse(encode('{"a":1}'))).toThrow(/tableau/i);
	});

	it('refuse un tableau qui ne contient pas que des objets', () => {
		expect(() => jsonFormat.parse(encode('[{"a":1},"texte"]'))).toThrow(/objets/i);
	});
});

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

	it('rend le rejet exploitable : ligne, colonne, valeur et motif', () => {
		const report = mapRows(
			{ columns: ['priorite'], rows: [{ priorite: 'sante' }, { priorite: 'inconnue' }] },
			[PRIORITE],
			{ priorite: 'priorite' }
		);

		const rejected = report.rejected[0];
		// Ligne 3 : l en-tete compte pour 1, et on numerote a partir de 1.
		expect(rejected?.line).toBe(3);
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

	it('refuse tout le fichier s il porte une colonne identifiante', () => {
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
	it('associe une colonne portant le code de la question', () => {
		const mapping = suggestMapping({ columns: ['priorite'], rows: [] }, [PRIORITE]);

		expect(mapping.priorite).toBe('priorite');
	});

	it('associe une colonne portant le libelle, accents et casse ignores', () => {
		const mapping = suggestMapping({ columns: ['Quelle est votre priorité ?'], rows: [] }, [
			PRIORITE
		]);

		expect(mapping.priorite).toBe('Quelle est votre priorité ?');
	});

	it('ne propose rien quand aucune colonne ne correspond', () => {
		const mapping = suggestMapping({ columns: ['colonne_z'], rows: [] }, [PRIORITE]);

		expect(mapping.priorite).toBeUndefined();
	});
});
