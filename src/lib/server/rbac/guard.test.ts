import { describe, expect, it } from 'vitest';
import type { SessionUser } from '../auth/session';
import { requireAnyPermission, requirePermission, requireUser } from './guard';

function user(permissions: string[]): SessionUser {
	return {
		id: 'u1',
		email: 'membre@humanitour.fr',
		displayName: 'Membre',
		role: { id: 'r1', slug: 'analyse', name: 'Analyse' },
		permissions: permissions as SessionUser['permissions']
	};
}

/** Extrait le code HTTP d une erreur levee par `error()` de SvelteKit. */
function statusOf(run: () => unknown): number {
	try {
		run();
	} catch (thrown) {
		return (thrown as { status: number }).status;
	}
	throw new Error('Aucune erreur levee alors qu une etait attendue.');
}

describe('requireUser', () => {
	it('laisse passer un utilisateur connecte', () => {
		const current = user([]);
		expect(requireUser(current)).toBe(current);
	});

	it('repond 401 a un visiteur anonyme', () => {
		// 401 et non 403 : la distinction compte, la premiere invite a se
		// connecter, la seconde dit que ce n est pas la peine.
		expect(statusOf(() => requireUser(null))).toBe(401);
	});
});

describe('requirePermission', () => {
	it('laisse passer quand la permission est detenue', () => {
		expect(requirePermission(user(['survey.import']), 'survey.import').id).toBe('u1');
	});

	it('repond 403 quand la permission manque', () => {
		expect(statusOf(() => requirePermission(user(['survey.read']), 'survey.publish'))).toBe(403);
	});

	it('repond 401 avant 403 pour un visiteur anonyme', () => {
		expect(statusOf(() => requirePermission(null, 'survey.publish'))).toBe(401);
	});
});

describe('requireAnyPermission', () => {
	it('suffit d une seule correspondance', () => {
		const current = user(['media.write']);
		expect(requireAnyPermission(current, ['media.write', 'media.publish'])).toBe(current);
	});

	it('repond 403 quand aucune ne correspond', () => {
		expect(statusOf(() => requireAnyPermission(user(['survey.read']), ['media.publish']))).toBe(
			403
		);
	});
});
