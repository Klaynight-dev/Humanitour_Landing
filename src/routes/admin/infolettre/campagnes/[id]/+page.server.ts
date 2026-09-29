import { error, fail, redirect } from '@sveltejs/kit';
import { recordAudit } from '$lib/server/audit';
import { prisma } from '$lib/server/db';
import { readOptionalText, readText } from '$lib/server/forms';
import { isMailConfigured, siteOrigin } from '$lib/server/mail/config';
import { isRunning, sendTest, startCampaign } from '$lib/server/newsletter/campaign';
import { requirePermission } from '$lib/server/rbac/guard';
import { can } from '$lib/shared/permissions';
import type { Actions, PageServerLoad } from './$types';

/**
 * Une campagne : redaction, essai, diffusion, puis bilan.
 *
 * Tant qu'elle est en brouillon, elle se modifie librement. Des que la
 * diffusion commence, son texte est fige : les destinataires deja servis ont
 * recu cette version, et le bilan doit parler de ce qu'ils ont lu.
 */

const SUBJECT_MAX = 200;
const PREHEADER_MAX = 150;

async function findCampaign(id: string) {
	const campaign = await prisma.newsletterCampaign.findUnique({
		where: { id },
		include: {
			createdBy: { select: { displayName: true } },
			sentBy: { select: { displayName: true } }
		}
	});
	if (!campaign) error(404, 'Campagne introuvable.');
	return campaign;
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const user = requirePermission(locals.user, 'newsletter.read');
	const campaign = await findCampaign(params.id);

	const [confirmed, queued] = await Promise.all([
		prisma.newsletterSubscriber.count({ where: { confirmedAt: { not: null } } }),
		prisma.newsletterDelivery.count({ where: { campaignId: campaign.id, status: 'QUEUED' } })
	]);

	return {
		campaign,
		confirmed,
		queued,
		running: isRunning(campaign.id),
		writable: can(user, 'newsletter.send'),
		mailConfigured: isMailConfigured(),
		origin: siteOrigin(url.origin),
		testAddress: user.email
	};
};

interface Draft {
	readonly subject: string;
	readonly preheader: string | null;
	readonly markdown: string;
}

function readDraft(form: FormData): Draft | string {
	const subject = readText(form, 'subject');
	const preheader = readOptionalText(form, 'preheader');
	const markdown = String(form.get('markdown') ?? '');

	if (subject === '')
		return "L'objet est obligatoire : c'est la première chose que lit le destinataire.";
	if (subject.length > SUBJECT_MAX) return `L'objet dépasse ${SUBJECT_MAX} caractères.`;
	if (preheader && preheader.length > PREHEADER_MAX) {
		return `Le texte d'aperçu dépasse ${PREHEADER_MAX} caractères : les messageries le coupent bien avant.`;
	}
	return { subject, preheader, markdown };
}

/**
 * Enregistre le brouillon soumis, ou rend l'erreur a afficher.
 *
 * Les actions d'essai et de diffusion enregistrent d'abord : on envoie ce qui
 * est a l'ecran, pas la derniere version sauvegardee.
 */
async function saveDraft(id: string, form: FormData): Promise<Draft | string> {
	const draft = readDraft(form);
	if (typeof draft === 'string') return draft;

	const { count } = await prisma.newsletterCampaign.updateMany({
		where: { id, status: 'DRAFT' },
		data: draft
	});
	if (count === 0) return 'Cette campagne a déjà été diffusée : son texte ne se modifie plus.';
	return draft;
}

export const actions: Actions = {
	save: async ({ locals, params, request }) => {
		requirePermission(locals.user, 'newsletter.send');
		const draft = await saveDraft(params.id, await request.formData());
		if (typeof draft === 'string') return fail(400, { message: draft });
		return { message: 'Brouillon enregistré.' };
	},

	test: async ({ locals, params, request, url }) => {
		const user = requirePermission(locals.user, 'newsletter.send');
		const draft = await saveDraft(params.id, await request.formData());
		if (typeof draft === 'string') return fail(400, { message: draft });
		if (draft.markdown.trim() === '')
			return fail(400, { message: 'Écrivez le texte avant de vous l’envoyer.' });

		try {
			await sendTest({ id: params.id, ...draft }, user.email, siteOrigin(url.origin));
		} catch (caught) {
			const detail = caught instanceof Error ? caught.message : String(caught);
			return fail(502, { message: `Essai non envoyé : ${detail}` });
		}

		return {
			message: `Essai envoyé à ${user.email}. Vérifiez-le sur ordinateur et sur téléphone.`
		};
	},

	send: async ({ locals, params, request, url }) => {
		const user = requirePermission(locals.user, 'newsletter.send');
		if (!isMailConfigured())
			return fail(400, { message: "L'envoi n'est pas configuré : RESEND_TOKEN est absent." });

		const campaign = await findCampaign(params.id);
		if (campaign.status === 'DRAFT') {
			const draft = await saveDraft(params.id, await request.formData());
			if (typeof draft === 'string') return fail(400, { message: draft });
			if (draft.markdown.trim() === '')
				return fail(400, { message: 'Une campagne sans texte ne part pas.' });
		}

		const started = await startCampaign(params.id, user.id, siteOrigin(url.origin));
		if (!started) return fail(409, { message: 'La diffusion est déjà en cours, ou terminée.' });

		return { message: 'Diffusion lancée. Cette page suit sa progression.' };
	},

	duplicate: async ({ locals, params }) => {
		const user = requirePermission(locals.user, 'newsletter.send');
		const source = await findCampaign(params.id);

		const copy = await prisma.newsletterCampaign.create({
			data: {
				subject: source.subject,
				preheader: source.preheader,
				markdown: source.markdown,
				createdById: user.id
			},
			select: { id: true }
		});

		await recordAudit({
			actorId: user.id,
			action: 'newsletter.campaign.create',
			entity: 'NewsletterCampaign',
			entityId: copy.id,
			metadata: { duplicateOf: source.id }
		});

		redirect(303, `/admin/infolettre/campagnes/${copy.id}`);
	},

	delete: async ({ locals, params }) => {
		const user = requirePermission(locals.user, 'newsletter.send');

		// Seul un brouillon se supprime : une campagne diffusee est un fait, son
		// bilan reste consultable.
		const { count } = await prisma.newsletterCampaign.deleteMany({
			where: { id: params.id, status: 'DRAFT' }
		});
		if (count === 0) return fail(400, { message: 'Seul un brouillon se supprime.' });

		await recordAudit({
			actorId: user.id,
			action: 'newsletter.campaign.delete',
			entity: 'NewsletterCampaign',
			entityId: params.id
		});

		redirect(303, '/admin/infolettre/campagnes');
	}
};
