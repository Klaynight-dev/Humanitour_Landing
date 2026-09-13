import { error } from '@sveltejs/kit';
import { can, canAny, type Permission } from '$lib/shared/permissions';
import type { SessionUser } from '../auth/session';

/**
 * Gardes de permission pour les routes du back-office.
 *
 * Un utilisateur non connecte recoit 401, un utilisateur connecte sans le droit
 * recoit 403. La distinction compte : la premiere invite a se connecter, la
 * seconde dit que ce n est pas la peine.
 */

export function requireUser(user: SessionUser | null): SessionUser {
	if (!user) error(401, { message: 'Connexion requise.', code: 'unauthenticated' });
	return user;
}

export function requirePermission(user: SessionUser | null, permission: Permission): SessionUser {
	const current = requireUser(user);
	if (!can(current, permission)) {
		error(403, { message: 'Vous n avez pas ce droit.', code: 'forbidden' });
	}
	return current;
}

/** Autorise l acces des qu une des permissions est detenue. */
export function requireAnyPermission(
	user: SessionUser | null,
	permissions: readonly Permission[]
): SessionUser {
	const current = requireUser(user);
	if (!canAny(current, permissions)) {
		error(403, { message: 'Vous n avez pas ce droit.', code: 'forbidden' });
	}
	return current;
}
