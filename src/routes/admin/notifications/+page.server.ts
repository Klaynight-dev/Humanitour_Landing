import { listNotifications, markAllRead } from '$lib/server/notifications/queries';
import { requireUser } from '$lib/server/rbac/guard';
import type { Actions, PageServerLoad } from './$types';

/**
 * Centre de notifications.
 *
 * Aucune permission propre : la page est ouverte a tout compte connecte, et
 * chaque type declare la permission de lecture qu'il exige. Une permission
 * « notifications » supplementaire pourrait diverger de ce que les ecrans
 * montrent deja.
 */
export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals.user);
	return { notifications: await listNotifications(user) };
};

export const actions: Actions = {
	markAllRead: async ({ locals }) => {
		const user = requireUser(locals.user);
		await markAllRead(user.id);
		return { message: 'Tout est marqué comme lu.' };
	}
};
