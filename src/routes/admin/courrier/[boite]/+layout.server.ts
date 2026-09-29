import { mailboxesFor, requireMailbox } from '$lib/server/mail/access';
import { isMailConfigured } from '$lib/server/mail/config';
import { can } from '$lib/shared/permissions';
import type { LayoutServerLoad } from './$types';

/**
 * Cadre commun a une boite : la liste des boites du compte, les dossiers, et
 * le bouton de redaction. Chaque page en dessous refait son propre controle
 * d'acces : un cadre ne protege pas les actions de ses pages.
 */
export const load: LayoutServerLoad = async ({ locals, params }) => {
	const { user, mailbox } = await requireMailbox(locals.user, params.boite);

	return {
		mailbox: {
			id: mailbox.id,
			address: mailbox.address,
			displayName: mailbox.displayName,
			kind: mailbox.kind
		},
		mailboxes: await mailboxesFor(user.id),
		canManage: can(user, 'mail.admin'),
		mailConfigured: isMailConfigured()
	};
};
