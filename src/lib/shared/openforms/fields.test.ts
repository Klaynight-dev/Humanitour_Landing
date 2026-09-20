import { describe, expect, it } from 'vitest';
import { requireFieldType } from './fields';
import { scaleBounds } from './fields/linear-scale';
import { parseSchema } from './parse';
import {
	asList,
	asText,
	checkTextBounds,
	flattenCell,
	isEmptyValue,
	readGridRows,
	readSingle,
	type OpenformsField
} from './types';

/**
 * Les briques de bas niveau du registre.
 *
 * Elles sont partagees par tous les types de champ : une divergence ici ferait
 * accepter une saisie sur une question et la refuser sur une autre, sans que
 * rien ne l'explique a l'ecran.
 */

function field(partial: Partial<OpenformsField> & { key: string; type: string }): OpenformsField {
	return { label: partial.key, required: false, options: [], ...partial };
}

describe('lecture d une saisie, quelle que soit sa forme', () => {
	it('reconnait un vide sous ses trois formes', () => {
		expect(isEmptyValue('')).toBe(true);
		expect(isEmptyValue('   ')).toBe(true);
		expect(isEmptyValue([])).toBe(true);
		expect(isEmptyValue({ ligne: '' })).toBe(true);
	});

	it('ne confond pas une saisie avec un vide', () => {
		expect(isEmptyValue('non')).toBe(false);
		expect(isEmptyValue(['non'])).toBe(false);
		expect(isEmptyValue({ ligne: 'oui' })).toBe(false);
	});

	it('rend une chaine a partir de n importe quelle forme', () => {
		expect(asText('sante')).toBe('sante');
		expect(asText(['presse', 'radio'])).toBe('presse; radio');
		expect(asText({ Presse: 'Oui', Radio: 'Non' })).toBe('Oui; Non');
	});

	it('rend une liste a partir de n importe quelle forme', () => {
		expect(asList(['presse'])).toEqual(['presse']);
		expect(asList('presse')).toEqual(['presse']);
		expect(asList('   ')).toEqual([]);
		expect(asList({ a: 'oui', b: '  ' })).toEqual(['oui']);
	});
});

describe('checkTextBounds', () => {
	it('ne verifie rien quand aucune borne n est declaree', () => {
		expect(checkTextBounds(field({ key: 'q', type: 'short_text' }), 'x')).toBeNull();
	});

	it('applique la longueur minimale et maximale', () => {
		const borne = field({
			key: 'q',
			type: 'short_text',
			validation: { minLength: 3, maxLength: 5 }
		});

		expect(checkTextBounds(borne, 'ab')).toMatch(/Au moins 3/);
		expect(checkTextBounds(borne, 'abcdef')).toMatch(/5 caractères au maximum/);
		expect(checkTextBounds(borne, 'abcd')).toBeNull();
	});

	it('applique une expression reguliere valide', () => {
		const code = field({
			key: 'q',
			type: 'short_text',
			validation: { pattern: '^[0-9]{5}$' }
		});

		expect(checkTextBounds(code, '22120')).toBeNull();
		expect(checkTextBounds(code, 'Hillion')).toMatch(/format attendu/i);
	});
});

describe('lecture d un envoi HTML, brique par brique', () => {
	it('lit un controle unique, ou rend un vide', () => {
		const body = new FormData();
		body.set('q', 'oui');

		expect(readSingle(field({ key: 'q', type: 'short_text' }), body)).toBe('oui');
		expect(readSingle(field({ key: 'absent', type: 'short_text' }), body)).toBe('');
	});

	it('lit une grille simple, une reponse par ligne', () => {
		const grille = field({
			key: 'g',
			type: 'grid',
			grid: { rows: ['A', 'B'], columns: ['1', '2'] }
		});

		const body = new FormData();
		body.set('g:A', '1');

		expect(readGridRows(grille, body, false)).toEqual({ A: '1', B: '' });
	});

	it('lit une grille a cases, plusieurs reponses par ligne', () => {
		const grille = field({
			key: 'g',
			type: 'checkbox_grid',
			grid: { rows: ['A'], columns: ['1', '2'] }
		});

		const body = new FormData();
		body.append('g:A', '1');
		body.append('g:A', '2');

		expect(readGridRows(grille, body, true)).toEqual({ A: '1; 2' });
	});

	it('rend un enregistrement vide quand la grille n a pas de lignes', () => {
		expect(readGridRows(field({ key: 'g', type: 'grid' }), new FormData(), false)).toEqual({});
	});
});

describe('flattenCell', () => {
	it('joint un tableau', () => {
		expect(flattenCell(['a', 'b'])).toBe('a; b');
	});

	it('serialise un objet inattendu plutot que de rendre « [object Object] »', () => {
		expect(flattenCell({ a: 1 })).toBe('{"a":1}');
	});

	it('laisse passer une valeur simple, null compris', () => {
		expect(flattenCell('texte')).toBe('texte');
		expect(flattenCell(7)).toBe(7);
		expect(flattenCell(null)).toBeNull();
	});
});

describe('scaleBounds', () => {
	it('retombe sur l echelle de 1 a 5 du builder', () => {
		expect(scaleBounds(field({ key: 'e', type: 'linear_scale' }))).toEqual({ min: 1, max: 5 });
	});

	it('lit les bornes declarees', () => {
		const e = field({ key: 'e', type: 'linear_scale', validation: { min: 0, max: 10 } });
		expect(scaleBounds(e)).toEqual({ min: 0, max: 10 });
	});

	it('remet des bornes inversees dans l ordre', () => {
		// Un formulaire mal configure rendrait sinon une echelle vide.
		const e = field({ key: 'e', type: 'linear_scale', validation: { min: 9, max: 2 } });
		expect(scaleBounds(e)).toEqual({ min: 2, max: 9 });
	});
});

describe('grilles', () => {
	const GRILLE = field({
		key: 'confiance',
		type: 'grid',
		required: true,
		grid: { rows: ['Presse', 'Radio'], columns: ['Oui', 'Non'] }
	});

	it('nomme la ligne restee sans reponse', () => {
		const reason = requireFieldType('grid').validate(GRILLE, { Presse: 'Oui', Radio: '' });
		expect(reason).toMatch(/Radio/);
	});

	it('accepte une grille complete', () => {
		const reason = requireFieldType('grid').validate(GRILLE, { Presse: 'Oui', Radio: 'Non' });
		expect(reason).toBeNull();
	});

	it('n exige rien d une grille facultative', () => {
		const optional = { ...GRILLE, required: false };
		expect(requireFieldType('grid').validate(optional, { Presse: '', Radio: '' })).toBeNull();
	});

	it('n envoie que les lignes remplies', () => {
		const data = requireFieldType('grid').toSubmission(GRILLE, { Presse: 'Oui', Radio: '' });
		expect(data).toEqual({ Presse: 'Oui' });
	});

	it('envoie chaque ligne d une grille a cases en tableau', () => {
		const grille = { ...GRILLE, type: 'checkbox_grid' };
		const data = requireFieldType('checkbox_grid').toSubmission(grille, { Presse: 'Oui; Non' });
		expect(data).toEqual({ Presse: ['Oui', 'Non'] });
	});

	it('laisse passer une valeur qui n est pas un objet a l aplatissement', () => {
		expect(requireFieldType('grid').toCell('brut')).toBe('brut');
	});
});

describe('choix multiple', () => {
	const MEDIAS = field({
		key: 'medias',
		type: 'checkbox',
		required: true,
		options: [
			{ value: 'presse', label: 'Presse' },
			{ value: 'radio', label: 'Radio' }
		]
	});

	it('refuse une liste vide quand la question est obligatoire', () => {
		expect(requireFieldType('checkbox').validate(MEDIAS, [])).toMatch(/au moins une/i);
	});

	it('refuse une modalite absente des options', () => {
		expect(requireFieldType('checkbox').validate(MEDIAS, ['presse', 'pigeon'])).toMatch(
			/proposées/
		);
	});

	it('accepte une valeur libre quand « autre » est ouvert', () => {
		const withOther = { ...MEDIAS, allowOther: true };
		expect(requireFieldType('checkbox').validate(withOther, ['le bouche a oreille'])).toBeNull();
	});

	it('laisse passer une valeur qui n est pas un tableau a l aplatissement', () => {
		expect(requireFieldType('checkbox').toCell('presse')).toBe('presse');
	});

	it('commence sur une liste vide', () => {
		expect(requireFieldType('checkbox').blank(MEDIAS)).toEqual([]);
	});
});

describe('champs sans reponse', () => {
	it('ne valide, n envoie ni ne lit rien pour un bloc de mise en page', () => {
		const type = requireFieldType('text_block');
		const bloc = field({ key: 'intro', type: 'text_block', required: true });

		expect(type.validate(bloc, '')).toBeNull();
		expect(type.toSubmission(bloc, '')).toBeUndefined();
		expect(type.readForm(bloc, new FormData())).toBe('');
		expect(type.blank(bloc)).toBe('');
	});

	it('ne collecte rien d un champ identifiant, meme obligatoire', () => {
		// C'est cette inertie qui garantit qu'un courriel ne peut pas partir
		// depuis ce site, quelle que soit la configuration distante.
		const type = requireFieldType('email');
		const courriel = field({ key: 'courriel', type: 'email', required: true });

		expect(type.validate(courriel, 'a@b.fr')).toBeNull();
		expect(type.toSubmission(courriel, 'a@b.fr')).toBeUndefined();
		expect(type.readForm(courriel, new FormData())).toBe('');
	});
});

describe('parseSchema, lectures defensives', () => {
	it('ecarte une option sans valeur exploitable', () => {
		const [parsed] = parseSchema([
			{ key: 'q', type: 'radio', options: [{ label: 'Sans valeur' }, 42, null] }
		]);

		expect(parsed?.options).toHaveLength(0);
	});

	it('ne retient une validation que si elle porte une borne', () => {
		const [vide] = parseSchema([{ key: 'q', type: 'short_text', validation: {} }]);
		const [pleine] = parseSchema([{ key: 'q', type: 'short_text', validation: { minLength: 2 } }]);

		expect(vide?.validation).toBeUndefined();
		expect(pleine?.validation?.minLength).toBe(2);
	});

	it('ecarte une condition sans champ de reference', () => {
		const [parsed] = parseSchema([{ key: 'q', type: 'short_text', condition: { value: 'oui' } }]);
		expect(parsed?.condition).toBeUndefined();
	});

	it('accepte une condition dont la valeur attendue est absente', () => {
		const [parsed] = parseSchema([
			{ key: 'q', type: 'short_text', condition: { fieldKey: 'autre' } }
		]);

		expect(parsed?.condition).toEqual({ fieldKey: 'autre', value: '' });
	});

	it('ecarte une grille incomplete', () => {
		const [sansColonnes] = parseSchema([{ key: 'g', type: 'grid', grid: { rows: ['A'] } }]);
		expect(sansColonnes?.grid).toBeUndefined();

		const [complete] = parseSchema([
			{ key: 'g', type: 'grid', grid: { rows: ['A'], columns: ['1'] } }
		]);
		expect(complete?.grid).toEqual({ rows: ['A'], columns: ['1'] });
	});

	it('ignore une entree qui n est pas un objet', () => {
		expect(parseSchema(['texte', null, 7])).toHaveLength(0);
	});

	it('lit « required » strictement', () => {
		// `required: "oui"` ne rend pas un champ obligatoire : seule la valeur
		// booleenne compte, sinon une chaine vide le rendrait facultatif par
		// accident et l'inverse serait tout aussi arbitraire.
		const [flou] = parseSchema([{ key: 'q', type: 'short_text', required: 'oui' }]);
		expect(flou?.required).toBe(false);
	});
});
