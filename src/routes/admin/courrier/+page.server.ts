import { redirect } from '@sveltejs/kit';
import { mailboxesFor } from '$lib/server/mail/access';
import { isMailConfigured } from '$lib/server/mail/config';
import { requirePermission } from '$lib/server/rbac/guard';
import { can } from '$lib/shared/permissions';
import type { PageServerLoad } from './$types';

/**
 * Entree de la messagerie : ouvre la premiere boite du compte, sa boite
 * personnelle d'abord. Sans aucune boite, la page dit pourquoi et a qui
 * s'adresser, plutot que d'afficher une liste vide sans explication.
 */
export const load: PageServerLoad = async ({ locals }) => {
	const user = requirePermission(locals.user, 'mail.use');
	const mailboxes = await mailboxesFor(user.id);

	const first = mailboxes[0];
	if (first) redirect(307, `/admin/courrier/${first.id}`);

	return { canManage: can(user, 'mail.admin'), mailConfigured: isMailConfigured() };
};
