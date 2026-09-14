import { describe, expect, it } from 'vitest';
import {
	readCheckbox,
	readDate,
	readHexColor,
	readOptionalInt,
	readOptionalText,
	readPrefixed,
	readText
} from './forms';

function build(entries: Record<string, string>): FormData {
	const form = new FormData();
	for (const [key, value] of Object.entries(entries)) form.append(key, value);
	return form;
}

describe('readText', () => {
	it('coupe les espaces', () => {
		expect(readText(build({ a: '  x  ' }), 'a')).toBe('x');
	});

	it('rend une chaine vide pour un champ absent', () => {
		expect(readText(build({}), 'a')).toBe('');
	});
});

describe('readOptionalText', () => {
	it('distingue le vide du renseigne', () => {
		expect(readOptionalText(build({ a: '  ' }), 'a')).toBeNull();
		expect(readOptionalText(build({ a: 'x' }), 'a')).toBe('x');
	});
});

describe('readCheckbox', () => {
	it('reconnait une case cochee', () => {
		expect(readCheckbox(build({ a: 'on' }), 'a')).toBe(true);
	});

	it('vaut faux quand le navigateur n envoie rien', () => {
		// Une case decochee n'apparait pas dans FormData : c'est le piege habituel.
		expect(readCheckbox(build({}), 'a')).toBe(false);
	});
});

describe('readDate', () => {
	it('lit une date de formulaire', () => {
		expect(readDate(build({ a: '2026-07-04' }), 'a')?.getUTCFullYear()).toBe(2026);
	});

	it('rend null pour un champ vide ou illisible', () => {
		expect(readDate(build({ a: '' }), 'a')).toBeNull();
		expect(readDate(build({ a: 'pas une date' }), 'a')).toBeNull();
	});
});

describe('readOptionalInt', () => {
	it('accepte un entier au-dessus de la borne', () => {
		expect(readOptionalInt(build({ a: '5' }), 'a')).toEqual({ ok: true, value: 5 });
	});

	it('accepte le vide comme « non renseigne »', () => {
		expect(readOptionalInt(build({ a: '' }), 'a')).toEqual({ ok: true, value: null });
	});

	it('refuse zero plutot que de le confondre avec le vide', () => {
		// Pour le seuil d'anonymat, la confusion leverait la protection.
		expect(readOptionalInt(build({ a: '0' }), 'a').ok).toBe(false);
	});

	it('refuse un decimal et un texte', () => {
		expect(readOptionalInt(build({ a: '4.5' }), 'a').ok).toBe(false);
		expect(readOptionalInt(build({ a: 'cinq' }), 'a').ok).toBe(false);
	});
});

describe('readHexColor', () => {
	it('accepte une couleur hexadecimale complete', () => {
		expect(readHexColor(build({ a: '#FF5757' }), 'a')).toBe('#FF5757');
	});

	it('refuse toute autre saisie', () => {
		expect(readHexColor(build({ a: 'rouge' }), 'a')).toBeNull();
		expect(readHexColor(build({ a: '#FFF' }), 'a')).toBeNull();
		expect(readHexColor(build({ a: '' }), 'a')).toBeNull();
	});
});

describe('readPrefixed', () => {
	it('collecte les champs portant le prefixe et retire celui-ci', () => {
		const form = build({ 'map:priorite': 'col_a', 'map:age': 'col_b', autre: 'x' });

		expect(readPrefixed(form, 'map:')).toEqual({ priorite: 'col_a', age: 'col_b' });
	});

	it('ignore les valeurs vides', () => {
		const form = build({ 'map:priorite': '', 'map:age': 'col_b' });

		expect(readPrefixed(form, 'map:')).toEqual({ age: 'col_b' });
	});

	it('rend un objet vide quand rien ne correspond', () => {
		expect(readPrefixed(build({ a: 'x' }), 'map:')).toEqual({});
	});
});
