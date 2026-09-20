import { describe, expect, it } from 'vitest';
import { EMAIL_MAX_LENGTH, normalizeEmail, parseEmail } from './newsletter';

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
