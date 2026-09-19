import { json } from '@sveltejs/kit';
import { unreadCount } from '$lib/server/notifications/queries';
import { requireUser } from '$lib/server/rbac/guard';
import type { RequestHandler } from './$types';

/**
 * Compteur de notifications non lues, interroge par la cloche de l'en-tete.
 *
 * Sondage toutes les vingt secondes cote client, et non flux SSE : pour une
 * equipe de quelques comptes, « un import a ete valide » ne demande pas la
 * seconde. Le sondage evite une connexion longue a surveiller et toute
 * configuration de mandataire inverse. Le modele de donnees ne changerait pas
 * si le besoin d'instantane se confirmait : seul ce point d'acces bougerait.
 */
export const GET: RequestHandler = async ({ locals }) => {
	const user = requireUser(locals.user);
	return json({ unread: await unreadCount(user) });
};
