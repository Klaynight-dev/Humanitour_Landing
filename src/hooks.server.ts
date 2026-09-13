import type { Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, validateSession } from '$lib/server/auth/session';

/**
 * Resout la session a chaque requete et la depose dans `locals`.
 *
 * C est le seul endroit qui lit le cookie de session : les routes lisent
 * `locals.user`, jamais le cookie.
 */
export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = await validateSession(event.cookies.get(SESSION_COOKIE));

	const response = await resolve(event);

	// En-tetes de securite. Pas de CSP ici : elle est definie dans la
	// configuration du serveur, ou elle peut evoluer sans redeploiement.
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('X-Frame-Options', 'DENY');

	return response;
};
