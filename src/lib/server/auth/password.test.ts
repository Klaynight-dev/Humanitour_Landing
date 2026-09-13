import { describe, expect, it } from 'vitest';
import {
	checkPasswordStrength,
	hashPassword,
	PASSWORD_MAX_LENGTH,
	PASSWORD_MIN_LENGTH,
	verifyPassword
} from './password';

describe('checkPasswordStrength', () => {
	it('accepte un mot de passe assez long', () => {
		expect(checkPasswordStrength('correct cheval batterie agrafe').ok).toBe(true);
	});

	it('refuse un mot de passe trop court', () => {
		const result = checkPasswordStrength('court');

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.reason).toContain(String(PASSWORD_MIN_LENGTH));
	});

	it('refuse une entree demesuree', () => {
		// Borne technique : Argon2 hache l entree entiere, une chaine de plusieurs
		// mega-octets serait un deni de service gratuit.
		expect(checkPasswordStrength('x'.repeat(PASSWORD_MAX_LENGTH + 1)).ok).toBe(false);
	});

	it('refuse une suite d espaces', () => {
		expect(checkPasswordStrength(' '.repeat(20)).ok).toBe(false);
	});

	it('n impose pas de classes de caracteres', () => {
		// La longueur prime : exiger « une majuscule et un chiffre » produit surtout
		// des « Motdepasse1 ».
		expect(checkPasswordStrength('tout en minuscules sans chiffre').ok).toBe(true);
	});
});

describe('hachage', () => {
	it('produit une empreinte Argon2id verifiable', async () => {
		const hash = await hashPassword('correct cheval batterie agrafe');

		expect(hash).toMatch(/^\$argon2id\$/);
		expect(await verifyPassword(hash, 'correct cheval batterie agrafe')).toBe(true);
	});

	it('refuse un mauvais mot de passe', async () => {
		const hash = await hashPassword('correct cheval batterie agrafe');

		expect(await verifyPassword(hash, 'mauvais mot de passe ici')).toBe(false);
	});

	it('produit une empreinte differente a chaque fois, grace au sel', async () => {
		const [first, second] = await Promise.all([hashPassword('meme phrase secrete'), hashPassword('meme phrase secrete')]);

		expect(first).not.toBe(second);
	});

	it('traite une empreinte corrompue comme un echec, pas comme une erreur', async () => {
		// Un compte au hash illisible doit se comporter comme un mauvais mot de
		// passe : une 500 signalerait a un attaquant que le compte existe.
		expect(await verifyPassword('pas-une-empreinte', 'peu importe')).toBe(false);
	});
});
