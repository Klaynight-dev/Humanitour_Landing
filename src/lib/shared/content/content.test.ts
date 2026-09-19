import { describe, expect, it } from 'vitest';
import {
	CONTENT_BLOCK_TYPES,
	CONTENT_PAGES,
	getContentBlockType,
	getContentPage,
	requireContentBlockType
} from './index';
import { parseDeclaredFields, readString, type ContentField } from './types';

describe('registre', () => {
	it('expose chaque type sous une cle unique', () => {
		const keys = CONTENT_BLOCK_TYPES.map((type) => type.key);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('retrouve un type par sa cle', () => {
		expect(getContentBlockType('hero')?.label).toBe('Couverture');
	});

	it('rend null pour une cle inconnue plutot que de lever', () => {
		expect(getContentBlockType('nexiste-pas')).toBeNull();
	});

	it('leve quand un appelant exige une cle inconnue', () => {
		expect(() => requireContentBlockType('nexiste-pas')).toThrow();
	});

	it('decrit trois pages editables, chacune avec une adresse publique', () => {
		expect(CONTENT_PAGES).toHaveLength(3);
		for (const page of CONTENT_PAGES) {
			expect(page.href.startsWith('/')).toBe(true);
		}
	});

	it('retrouve une page par sa cle', () => {
		expect(getContentPage('HOME')?.href).toBe('/');
		expect(getContentPage('AUTRE')).toBeNull();
	});
});

describe('readString', () => {
	it('rend null pour une valeur absente, vide ou non textuelle', () => {
		expect(readString({ a: '   ' }, 'a')).toBeNull();
		expect(readString({ a: 12 }, 'a')).toBeNull();
		expect(readString(null, 'a')).toBeNull();
		expect(readString({}, 'a')).toBeNull();
	});

	it('rogne les espaces autour de la valeur', () => {
		expect(readString({ a: '  bonjour  ' }, 'a')).toBe('bonjour');
	});
});

describe('parseDeclaredFields', () => {
	const fields: readonly ContentField[] = [
		{ name: 'title', label: 'Titre', type: 'text', required: true },
		{ name: 'note', label: 'Note', type: 'textarea', required: false },
		{ name: 'count', label: 'Nombre', type: 'number', required: false }
	];

	it('refuse un champ obligatoire vide au lieu de lui donner une valeur par defaut', () => {
		const result = parseDeclaredFields(fields, { title: '  ' });
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toContain('Titre');
	});

	it('omet un champ facultatif vide plutot que de stocker une chaine vide', () => {
		const result = parseDeclaredFields(fields, { title: 'Bonjour', note: '' });
		expect(result.ok).toBe(true);
		if (result.ok) expect('note' in result.data).toBe(false);
	});

	it('convertit un champ numerique', () => {
		const result = parseDeclaredFields(fields, { title: 'Bonjour', count: '42' });
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data.count).toBe(42);
	});

	it('refuse un champ numerique qui ne l est pas', () => {
		const result = parseDeclaredFields(fields, { title: 'Bonjour', count: 'beaucoup' });
		expect(result.ok).toBe(false);
	});

	it('ignore les cles non declarees par le type', () => {
		const result = parseDeclaredFields(fields, { title: 'Bonjour', intrus: 'valeur' });
		expect(result.ok).toBe(true);
		if (result.ok) expect('intrus' in result.data).toBe(false);
	});
});

describe('bloc chiffres', () => {
	const figures = requireContentBlockType('figures');

	it('accepte un chiffre seul avec son libelle', () => {
		expect(figures.parseData({ value1: '4 000 km', label1: 'parcourus à vélo' }).ok).toBe(true);
	});

	it('refuse un chiffre sans ce qu il compte', () => {
		const result = figures.parseData({
			value1: '4 000 km',
			label1: 'parcourus à vélo',
			value2: '1 000'
		});
		expect(result.ok).toBe(false);
	});

	it('refuse un libelle sans chiffre', () => {
		const result = figures.parseData({
			value1: '4 000 km',
			label1: 'parcourus à vélo',
			label2: 'personnes rencontrées'
		});
		expect(result.ok).toBe(false);
	});
});

describe('bloc citation', () => {
	it('exige la citation et son auteur', () => {
		const quote = requireContentBlockType('quote');
		expect(quote.parseData({ quote: 'Une phrase' }).ok).toBe(false);
		expect(quote.parseData({ quote: 'Une phrase', author: 'Pierre Bourdieu' }).ok).toBe(true);
	});
});
