import { describe, expect, it } from 'vitest';
import {
	EMPTY_DOC,
	fromPlainText,
	isEmptyDoc,
	parseRichText,
	safeHref,
	toPlainText
} from './richtext';

describe('safeHref', () => {
	it('accepte les protocoles du web et le courriel', () => {
		expect(safeHref('https://humanitour.fr')).toBe('https://humanitour.fr/');
		expect(safeHref('http://example.org/a')).toBe('http://example.org/a');
		expect(safeHref('mailto:contact@humanitour.fr')).toBe('mailto:contact@humanitour.fr');
	});

	it('accepte une adresse interne au site', () => {
		expect(safeHref('/donnees')).toBe('/donnees');
		expect(safeHref('#methodologie')).toBe('#methodologie');
	});

	it('refuse les protocoles qui executent du code', () => {
		// Le cas qui compte : un compte compromis ne doit pas pouvoir poser un lien
		// qui execute du script chez les visiteurs.
		expect(safeHref('javascript:alert(1)')).toBeNull();
		expect(safeHref('JavaScript:alert(1)')).toBeNull();
		expect(safeHref('data:text/html;base64,PHNjcmlwdD4=')).toBeNull();
		expect(safeHref('vbscript:msgbox')).toBeNull();
	});

	it('refuse une adresse vide ou incomprehensible', () => {
		expect(safeHref('   ')).toBeNull();
		expect(safeHref('pas une adresse')).toBeNull();
	});
});

describe('parseRichText', () => {
	it('lit un document valide', () => {
		const doc = parseRichText({
			blocks: [{ type: 'paragraph', items: [[{ text: 'Bonjour', marks: ['strong'] }]] }]
		});

		expect(doc.blocks).toHaveLength(1);
		expect(doc.blocks.at(0)?.items.at(0)?.at(0)).toEqual({ text: 'Bonjour', marks: ['strong'] });
	});

	it('retire un lien dangereux mais garde son texte', () => {
		const doc = parseRichText({
			blocks: [
				{ type: 'paragraph', items: [[{ text: 'cliquez ici', href: 'javascript:alert(1)' }]] }
			]
		});

		const run = doc.blocks.at(0)?.items.at(0)?.at(0);
		expect(run?.text).toBe('cliquez ici');
		expect(run?.href).toBeUndefined();
	});

	it('conserve un lien sur', () => {
		const doc = parseRichText({
			blocks: [{ type: 'paragraph', items: [[{ text: 'le site', href: '/donnees' }]] }]
		});

		expect(doc.blocks.at(0)?.items.at(0)?.at(0)?.href).toBe('/donnees');
	});

	it('rejette un type de bloc inconnu plutot que de le laisser passer', () => {
		const doc = parseRichText({ blocks: [{ type: 'script', items: [[{ text: 'x' }]] }] });
		expect(doc).toEqual(EMPTY_DOC);
	});

	it('rejette une marque inconnue', () => {
		const doc = parseRichText({
			blocks: [{ type: 'paragraph', items: [[{ text: 'x', marks: ['onclick'] }]] }]
		});
		expect(doc).toEqual(EMPTY_DOC);
	});

	it('retire les fragments vides', () => {
		const doc = parseRichText({
			blocks: [
				{ type: 'paragraph', items: [[{ text: '' }]] },
				{ type: 'paragraph', items: [[{ text: 'garde' }]] }
			]
		});

		expect(doc.blocks).toHaveLength(1);
	});

	it('lit le JSON de l editeur quand il arrive sous forme de chaine', () => {
		const doc = parseRichText('{"blocks":[{"type":"paragraph","items":[[{"text":"Bonjour"}]]}]}');
		expect(toPlainText(doc)).toBe('Bonjour');
	});

	it('lit du texte brut, pour la saisie sans JavaScript', () => {
		const doc = parseRichText('Premier paragraphe.\n\nSecond paragraphe.');
		expect(doc.blocks).toHaveLength(2);
		expect(toPlainText(doc)).toBe('Premier paragraphe.\n\nSecond paragraphe.');
	});

	it('lit du texte brut qui commence par une accolade sans planter', () => {
		const doc = parseRichText('{ceci n est pas du JSON');
		expect(toPlainText(doc)).toBe('{ceci n est pas du JSON');
	});

	it('rend un document vide pour une valeur absurde', () => {
		expect(parseRichText(null)).toEqual(EMPTY_DOC);
		expect(parseRichText(42)).toEqual(EMPTY_DOC);
		expect(parseRichText('   ')).toEqual(EMPTY_DOC);
	});
});

describe('fromPlainText et toPlainText', () => {
	it('font l aller-retour sur des paragraphes', () => {
		const source = 'Un.\n\nDeux.';
		expect(toPlainText(fromPlainText(source))).toBe(source);
	});

	it('ignore les lignes vides en trop', () => {
		expect(fromPlainText('Un.\n\n\n\nDeux.').blocks).toHaveLength(2);
	});

	it('rend une liste ligne par ligne', () => {
		const doc = parseRichText({
			blocks: [{ type: 'bullet-list', items: [[{ text: 'un' }], [{ text: 'deux' }]] }]
		});
		expect(toPlainText(doc)).toBe('un\ndeux');
	});
});

describe('isEmptyDoc', () => {
	it('reconnait un document sans bloc', () => {
		expect(isEmptyDoc(EMPTY_DOC)).toBe(true);
		expect(isEmptyDoc(fromPlainText('texte'))).toBe(false);
	});
});
