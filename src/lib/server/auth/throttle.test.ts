import { describe, expect, it } from 'vitest';
import {
	check,
	clear,
	createThrottle,
	MAX_ATTEMPTS,
	prune,
	recordFailure,
	WINDOW_MS
} from './throttle';

const IP = '203.0.113.7';

describe('check', () => {
	it('laisse passer une premiere tentative', () => {
		const state = createThrottle();

		expect(check(state, 'a@humanitour.fr', IP)).toMatchObject({
			blocked: false,
			remaining: MAX_ATTEMPTS
		});
	});

	it('ne compte pas la consultation comme une tentative', () => {
		// Sinon une connexion reussie consommerait un essai.
		const state = createThrottle();

		check(state, 'a@humanitour.fr', IP);
		check(state, 'a@humanitour.fr', IP);

		expect(check(state, 'a@humanitour.fr', IP).remaining).toBe(MAX_ATTEMPTS);
	});
});

describe('recordFailure', () => {
	it('decompte les tentatives restantes', () => {
		const state = createThrottle();

		expect(recordFailure(state, 'a@humanitour.fr', IP).remaining).toBe(MAX_ATTEMPTS - 1);
		expect(recordFailure(state, 'a@humanitour.fr', IP).remaining).toBe(MAX_ATTEMPTS - 2);
	});

	it('bloque au-dela du plafond et annonce le delai', () => {
		const state = createThrottle();
		const now = 1_000_000;

		for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
			recordFailure(state, 'a@humanitour.fr', IP, now);
		}

		const verdict = check(state, 'a@humanitour.fr', IP, now);
		expect(verdict.blocked).toBe(true);
		expect(verdict.retryAfterSeconds).toBeGreaterThan(0);
	});

	it('rouvre apres la fenetre', () => {
		const state = createThrottle();
		const now = 1_000_000;

		for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
			recordFailure(state, 'a@humanitour.fr', IP, now);
		}

		expect(check(state, 'a@humanitour.fr', IP, now + WINDOW_MS + 1).blocked).toBe(false);
	});

	it('ignore la casse et les espaces de l identifiant', () => {
		const state = createThrottle();

		recordFailure(state, 'a@humanitour.fr', IP);

		expect(check(state, '  A@HUMANITOUR.FR  ', IP).remaining).toBe(MAX_ATTEMPTS - 1);
	});

	it('separe les compteurs par adresse : on ne bloque pas le compte d autrui', () => {
		// Sans l adresse dans la cle, un attaquant bloquerait n importe quel compte
		// en echouant volontairement.
		const state = createThrottle();
		const now = 1_000_000;

		for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
			recordFailure(state, 'victime@humanitour.fr', '198.51.100.1', now);
		}

		expect(check(state, 'victime@humanitour.fr', '198.51.100.1', now).blocked).toBe(true);
		expect(check(state, 'victime@humanitour.fr', IP, now).blocked).toBe(false);
	});

	it('separe les compteurs par identifiant : un reseau partage ne se bloque pas seul', () => {
		const state = createThrottle();
		const now = 1_000_000;

		for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
			recordFailure(state, 'a@humanitour.fr', IP, now);
		}

		expect(check(state, 'b@humanitour.fr', IP, now).blocked).toBe(false);
	});

	it('supporte une adresse inconnue', () => {
		const state = createThrottle();

		expect(recordFailure(state, 'a@humanitour.fr', null).remaining).toBe(MAX_ATTEMPTS - 1);
	});
});

describe('clear', () => {
	it('efface le compteur apres une connexion reussie', () => {
		const state = createThrottle();

		recordFailure(state, 'a@humanitour.fr', IP);
		clear(state, 'a@humanitour.fr', IP);

		expect(check(state, 'a@humanitour.fr', IP).remaining).toBe(MAX_ATTEMPTS);
	});
});

describe('prune', () => {
	it('retire les fenetres expirees', () => {
		// Sans purge, la table grossirait indefiniment sous attaque distribuee.
		const state = createThrottle();
		const now = 1_000_000;

		recordFailure(state, 'a@humanitour.fr', IP, now);
		recordFailure(state, 'b@humanitour.fr', IP, now);

		expect(prune(state, now + WINDOW_MS + 1)).toBe(2);
		expect(state.attempts.size).toBe(0);
	});

	it('conserve les fenetres encore actives', () => {
		const state = createThrottle();
		const now = 1_000_000;

		recordFailure(state, 'a@humanitour.fr', IP, now);

		expect(prune(state, now + 1000)).toBe(0);
		expect(state.attempts.size).toBe(1);
	});
});
