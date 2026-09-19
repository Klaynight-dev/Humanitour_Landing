import { describe, expect, it } from 'vitest';
import { NON_RESPONSE_KEY, type ModalityDescriptor } from '$shared/questions';
import type { AnswerRow } from './aggregate';
import { buildOutcome, type Axis } from './explore';
import { everyone } from './population';
import { resultToCsv } from './result-csv';

const PRIORITE: readonly ModalityDescriptor[] = [
	{ key: 'pouvoir-achat', label: "Le pouvoir d'achat", isNonResponse: false },
	{ key: 'sante', label: 'La santé, l’hôpital', isNonResponse: false },
	{ key: NON_RESPONSE_KEY, label: 'Sans réponse', isNonResponse: true }
];

const REGION: readonly ModalityDescriptor[] = [
	{ key: 'bre', label: 'Bretagne', isNonResponse: false }
];

const ROWS: readonly AnswerRow[] = [
	{ responseId: 'r1', modalityKey: 'pouvoir-achat' },
	{ responseId: 'r2', modalityKey: 'pouvoir-achat' },
	{ responseId: 'r3', modalityKey: 'sante' },
	{ responseId: 'r4', modalityKey: NON_RESPONSE_KEY }
];

const X: Axis = { code: 'priorite', label: 'Priorité', modalities: PRIORITE, rows: ROWS };
const Y: Axis = {
	code: 'region',
	label: 'Région',
	modalities: REGION,
	rows: ROWS.map((row) => ({ responseId: row.responseId, modalityKey: 'bre' }))
};

/** Le CSV sans son BOM, decoupe en lignes. */
function linesOf(csv: string): string[] {
	return csv
		.replace(/^\uFEFF/, '')
		.trimEnd()
		.split('\r\n');
}

function csvFor(y: Axis | null, threshold = 1): string {
	return resultToCsv(
		buildOutcome({
			x: X,
			y,
			population: everyone(4),
			threshold,
			includeNonResponses: true
		})
	);
}

describe('export du resultat affiche', () => {
	it('commence par un BOM, pour qu un tableur garde les accents', () => {
		expect(csvFor(null).startsWith('﻿')).toBe(true);
	});

	it('nomme ses colonnes et compte une ligne par modalite', () => {
		const lines = linesOf(csvFor(null));

		expect(lines[0]).toBe('modalite,libelle,non_reponse,effectif,part,masque');
		expect(lines).toHaveLength(4);
	});

	it('sort la part en nombre relisible par un tableur', () => {
		const lines = linesOf(csvFor(null));
		const pouvoirAchat = lines.find((row) => row.startsWith('pouvoir-achat'));

		expect(pouvoirAchat).toContain('0.5000');
	});

	it('marque la non-reponse au lieu de l effacer', () => {
		const lines = linesOf(csvFor(null));
		const nonResponse = lines.find((row) => row.startsWith(NON_RESPONSE_KEY));

		expect(nonResponse).toContain('oui');
	});

	it('echappe un libelle contenant une virgule', () => {
		expect(csvFor(null)).toContain('"La santé, l’hôpital"');
	});

	it('sort une case masquee vide et signalee, jamais a zero', () => {
		// Seuil a 3 : « sante » (1 repondant) et la non-reponse (1) sont masquees.
		const lines = linesOf(csvFor(null, 3));
		const sante = lines.find((row) => row.startsWith('sante'));

		expect(sante).toContain(',,');
		expect(sante?.endsWith('oui')).toBe(true);
	});

	it('deplie le croisement en une ligne par case', () => {
		const lines = linesOf(csvFor(Y));

		expect(lines[0]).toBe('x,libelle_x,y,libelle_y,effectif,part_ligne,masque');
		// Trois modalites en X, une seule en Y.
		expect(lines).toHaveLength(4);
	});

	it('rend les seuls en-tetes quand la population est sous le seuil', () => {
		const csv = resultToCsv(
			buildOutcome({
				x: X,
				y: null,
				population: everyone(4),
				threshold: 50,
				includeNonResponses: true
			})
		);

		expect(linesOf(csv)).toHaveLength(1);
	});
});
