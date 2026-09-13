import { redirect } from '@sveltejs/kit';
import { PERMISSIONS, type Permission } from '$lib/shared/permissions';
import type { LayoutServerLoad } from './$types';

/**
 * Garde du back-office.
 *
 * Un visiteur non connecte est redirige vers la connexion avec l'adresse
 * demandee, pour y revenir apres : perdre la page visee a chaque expiration de
 * session serait une brimade quotidienne.
 */
export const load: LayoutServerLoad = ({ locals, url }) => {
	if (!locals.user) {
		redirect(303, `/connexion?suite=${encodeURIComponent(url.pathname + url.search)}`);
	}

	return {
		user: locals.user,
		// Les libelles descendent une fois ici plutot que d'etre recopies dans
		// chaque ecran du back-office.
		permissionLabels: Object.fromEntries(
			(Object.keys(PERMISSIONS) as Permission[]).map((key) => [key, PERMISSIONS[key].label])
		)
	};
};
