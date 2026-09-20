import { describe, expect, it } from 'vitest';
import {
	CONTENT_BLOCK_TYPES,
	CONTENT_PAGES,
	contentBlockLibrary,
	getContentBlockType,
	getContentPage,
	requireContentBlockType
} from './index';
import { parseDeclaredFields, readString, safeImageSrc, type ContentField } from './fields';

describe('registre des sections', () => {
	it('expose chaque type sous une cle unique', () => {
		const keys = CONTENT_BLOCK_TYPES.map((type) => type.key);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('retrouve un type par sa cle', () => {
		expect(getContentBlockType('cover')?.label).toBe('Couverture');
	});

	it('rend null pour une cle inconnue plutot que de lever', () => {
		expect(getContentBlockType('nexiste-pas')).toBeNull();
	});

	it('leve quand un appelant exige une cle inconnue', () => {
		expect(() => requireContentBlockType('nexiste-pas')).toThrow();
	});

	it('range toute la bibliotheque en familles, sans en perdre', () => {
		const ranged = contentBlockLibrary().flatMap((group) => group.types);
		expect(ranged).toHaveLength(CONTENT_BLOCK_TYPES.length);
	});

	it('donne a chaque type un contenu de depart qui passe sa propre validation', () => {
		// Une section ajoutee arrive remplie d'un exemple juste : une page ne doit
		// jamais passer par un etat casse entre l'ajout et la saisie.
		for (const type of CONTENT_BLOCK_TYPES) {
			const result = type.parseData(type.starter);
			expect(result.ok ? null : `${type.key} : ${result.reason}`).toBeNull();
		}
	});
});

describe('registre des pages', () => {
	it('decrit huit pages editables, chacune avec une adresse publique', () => {
		expect(CONTENT_PAGES).toHaveLength(8);
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

describe('safeImageSrc', () => {
	it('accepte un chemin du site et une adresse http(s)', () => {
		expect(safeImageSrc('/photos/tour.jpg')).toBe('/photos/tour.jpg');
		expect(safeImageSrc('https://exemple.fr/a.png')).toBe('https://exemple.fr/a.png');
	});

	it('refuse ce qui n est pas une image servie', () => {
		// Le back-office n'a pas a pouvoir poser une charge utile dans un `src`,
		// meme depuis un compte compromis.
		expect(safeImageSrc('javascript:alert(1)')).toBeNull();
		expect(safeImageSrc('data:image/svg+xml,<svg onload=alert(1)>')).toBeNull();
		expect(safeImageSrc('//ailleurs.example/a.png')).toBeNull();
		expect(safeImageSrc('   ')).toBeNull();
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
		expect(parseDeclaredFields(fields, { title: 'Bonjour', count: 'beaucoup' }).ok).toBe(false);
	});

	it('ignore les cles non declarees par le type', () => {
		const result = parseDeclaredFields(fields, { title: 'Bonjour', intrus: 'valeur' });
		expect(result.ok).toBe(true);
		if (result.ok) expect('intrus' in result.data).toBe(false);
	});
});

describe('champ image', () => {
	const fields: readonly ContentField[] = [
		{ name: 'image', label: 'Photographie', type: 'image', required: false }
	];

	it('exige une description des qu une image est posee', () => {
		// Une image sans texte alternatif ne se publie pas : c'est la meme regle
		// que pour un chiffre sans libelle, appliquee a ce qui se voit.
		const result = parseDeclaredFields(fields, { image: { src: '/photos/a.jpg' } });
		expect(result.ok).toBe(false);
	});

	it('garde les dimensions natives quand elles sont connues', () => {
		const result = parseDeclaredFields(fields, {
			image: { src: '/photos/a.jpg', alt: 'Un vélo', width: '2048', height: '1536' }
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.image).toEqual({
				src: '/photos/a.jpg',
				alt: 'Un vélo',
				width: 2048,
				height: 1536
			});
		}
	});

	it('accepte l absence d image sur un champ facultatif', () => {
		expect(parseDeclaredFields(fields, {}).ok).toBe(true);
	});
});

describe('champ liste', () => {
	const fields: readonly ContentField[] = [
		{
			name: 'items',
			label: 'Chiffres',
			type: 'list',
			required: false,
			itemLabel: 'un chiffre',
			max: 2,
			item: [
				{ name: 'value', label: 'Chiffre', type: 'text', required: true },
				{ name: 'label', label: 'Ce qu’il compte', type: 'text', required: true }
			]
		}
	];

	it('ecarte les lignes entierement vides : c est ainsi qu on en supprime une', () => {
		const result = parseDeclaredFields(fields, {
			items: [{ value: '4 000', label: 'kilomètres' }, { value: '', label: '' }]
		});
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data.items).toHaveLength(1);
	});

	it('refuse une ligne commencee mais incomplete, en nommant son rang', () => {
		// Un chiffre sans ce qu'il compte n'est pas une information : c'est la
		// regle editoriale du projet, et elle vaut ligne par ligne.
		const result = parseDeclaredFields(fields, {
			items: [{ value: '4 000', label: 'kilomètres' }, { value: '1 000' }]
		});
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toContain('élément 2');
	});

	it('refuse plus de lignes que la mise en page n en accepte', () => {
		const rows = [1, 2, 3].map((n) => ({ value: String(n), label: 'x' }));
		expect(parseDeclaredFields(fields, { items: rows }).ok).toBe(false);
	});

	it('ignore une valeur qui n est pas une liste', () => {
		expect(parseDeclaredFields(fields, { items: 'pas une liste' }).ok).toBe(true);
	});
});

describe('champ de mise en page', () => {
	const fields: readonly ContentField[] = [
		{
			name: 'surface',
			label: 'Fond',
			type: 'choice',
			required: false,
			options: [
				{ value: 'paper', label: 'Blanc' },
				{ value: 'ink', label: 'Noir' }
			],
			fallback: 'paper'
		}
	];

	it('retombe sur le repli quand la variante n existe pas', () => {
		// Une variante retiree du registre, ou une donnee forgee, ne doit pas
		// produire une section sans fond.
		const result = parseDeclaredFields(fields, { surface: 'fuchsia' });
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data.surface).toBe('paper');
	});

	it('conserve une variante connue', () => {
		const result = parseDeclaredFields(fields, { surface: 'ink' });
		if (result.ok) expect(result.data.surface).toBe('ink');
	});
});
