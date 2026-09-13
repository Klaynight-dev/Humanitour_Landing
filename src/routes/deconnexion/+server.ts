import { redirect } from '@sveltejs/kit';
import { clearSessionCookie, destroySession, SESSION_COOKIE } from '$lib/server/auth/session';
import type { RequestHandler } from './$types';

/**
 * Deconnexion.
 *
 * En POST uniquement : une deconnexion accessible en GET se declenche par une
 * simple image distante sur un site tiers.
 */
export const POST: RequestHandler = async ({ cookies }) => {
	await destroySession(cookies.get(SESSION_COOKIE));
	clearSessionCookie(cookies);
	redirect(303, '/');
};
