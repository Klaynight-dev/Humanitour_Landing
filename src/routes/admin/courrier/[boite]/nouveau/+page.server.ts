import { fail, redirect } from '@sveltejs/kit';
import { requireMailbox } from '$lib/server/mail/access';
import { readCompose } from '$lib/server/mail/compose';
import { siteOrigin } from '$lib/server/mail/config';
import { sendFromMailbox } from '$lib/server/mail/outbound';
import type { Actions, PageServerLoad } from './$types';

/**
 * Nouveau message depuis une boite.
 *
 * `?a=adresse` pre-remplit le destinataire : d'autres ecrans du back-office
 * peuvent ainsi proposer « Ecrire a... » sans connaitre ce formulaire.
 */
export const load: PageServerLoad = async ({ locals, params, url }) => {
	const { mailbox } = await requireMailbox(locals.user, params.boite);
	return { signature: mailbox.signature, to: url.searchParams.get('a') ?? '' };
};

export const actions: Actions = {
	send: async ({ locals, params, request, url }) => {
		const { user, mailbox } = await requireMailbox(locals.user, params.boite);

		const parsed = readCompose(await request.formData());
		if (!parsed.ok) return fail(400, { message: parsed.message, values: parsed.values });

		let threadId: string;
		try {
			({ threadId } = await sendFromMailbox({
				mailbox,
				userId: user.id,
				to: parsed.to,
				cc: parsed.cc,
				bcc: parsed.bcc,
				subject: parsed.subject,
				markdown: parsed.markdown,
				files: parsed.files,
				threadId: null,
				quoted: null,
				origin: siteOrigin(url.origin)
			}));
		} catch (caught) {
			const detail = caught instanceof Error ? caught.message : String(caught);
			return fail(502, {
				message: `Message non envoyé : ${detail}`,
				values: {
					to: parsed.to.join(', '),
					cc: parsed.cc.join(', '),
					bcc: parsed.bcc.join(', '),
					subject: parsed.subject,
					markdown: parsed.markdown
				}
			});
		}

		redirect(303, `/admin/courrier/${mailbox.id}/fil/${threadId}`);
	}
};
