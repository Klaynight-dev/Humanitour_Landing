import { describe, expect, it } from 'vitest';
import { EMAIL_MAX_LENGTH, normalizeEmail, parseEmail, parseEmailList } from './newsletter';

describe('normalizeEmail', () => {
	it('rogne les espaces et rabat la casse', () => {
		expect(normalizeEmail('  Alice@Exemple.FR ')).toBe('alice@exemple.fr');
	});

	it('rabat la casse sans dependre de la locale du serveur', () => {
		// Le piege turc : en `tr-TR`, `I` minuscule donne `ı` et l adresse change
		// de domaine. Le rabattement est donc explicitement en `en-US`.
		expect(normalizeEmail('INFO@IZMIR.fr')).toBe('info@izmir.fr');
	});
});

describe('parseEmail', () => {
	it('accepte une adresse ordinaire, normalisee', () => {
		const result = parseEmail(' Come.Moudenner@Humanitour.FR ');
		expect(result).toEqual({ ok: true, email: 'come.moudenner@humanitour.fr' });
	});

	it('accepte un sous-domaine et une etiquette de tri', () => {
		expect(parseEmail('jeanne+infolettre@mail.humanitour.fr').ok).toBe(true);
	});

	it('refuse une saisie vide', () => {
		expect(parseEmail('   ')).toEqual({
			ok: false,
			reason: 'Renseignez votre adresse électronique.'
		});
	});

	it('refuse une adresse plus longue que la RFC ne l autorise', () => {
		const tooLong = `${'a'.repeat(EMAIL_MAX_LENGTH)}@exemple.fr`;
		expect(parseEmail(tooLong).ok).toBe(false);
	});

	it('refuse les espaces internes', () => {
		expect(parseEmail('deux mots@exemple.fr').ok).toBe(false);
	});

	it('refuse zero ou deux arobases', () => {
		expect(parseEmail('sans-arobase.fr').ok).toBe(false);
		expect(parseEmail('a@b@exemple.fr').ok).toBe(false);
	});

	it('refuse une partie manquante', () => {
		expect(parseEmail('@exemple.fr').ok).toBe(false);
		expect(parseEmail('alice@').ok).toBe(false);
	});

	it('refuse un domaine sans point ou mal ponctue', () => {
		expect(parseEmail('alice@localhost').ok).toBe(false);
		expect(parseEmail('alice@.fr').ok).toBe(false);
		expect(parseEmail('alice@exemple.').ok).toBe(false);
	});
});

describe('parseEmailList', () => {
	it('separe une colonne de tableur, une par ligne', () => {
		const result = parseEmailList('alice@exemple.fr\nBob@Exemple.FR\ncarole@exemple.fr');
		expect(result).toEqual({
			emails: ['alice@exemple.fr', 'bob@exemple.fr', 'carole@exemple.fr'],
			invalid: [],
			duplicates: 0
		});
	});

	it('accepte aussi la virgule et le point-virgule comme separateurs', () => {
		const result = parseEmailList('alice@exemple.fr, bob@exemple.fr; carole@exemple.fr');
		expect(result.emails).toEqual(['alice@exemple.fr', 'bob@exemple.fr', 'carole@exemple.fr']);
	});

	it('deduplique en respectant la normalisation de casse', () => {
		const result = parseEmailList('alice@exemple.fr\nAlice@Exemple.FR');
		expect(result.emails).toEqual(['alice@exemple.fr']);
		expect(result.duplicates).toBe(1);
	});

	it('ecarte les entrees invalides sans faire echouer les autres', () => {
		const result = parseEmailList('alice@exemple.fr\npas-une-adresse\nbob@exemple.fr');
		expect(result.emails).toEqual(['alice@exemple.fr', 'bob@exemple.fr']);
		expect(result.invalid).toEqual(['pas-une-adresse']);
	});

	it('rend des listes vides sur une saisie vide', () => {
		expect(parseEmailList('   \n  ')).toEqual({ emails: [], invalid: [], duplicates: 0 });
	});
});
