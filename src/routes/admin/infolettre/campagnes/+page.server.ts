import { redirect } from '@sveltejs/kit';
import { recordAudit } from '$lib/server/audit';
import { prisma } from '$lib/server/db';
import { requirePermission } from '$lib/server/rbac/guard';
import { can } from '$lib/shared/permissions';
import type { Actions, PageServerLoad } from './$types';

/**
 * Les campagnes de l'infolettre : brouillons, diffusions en cours, envoyees.
 *
 * Lire la liste demande `newsletter.read`, comme la liste des abonnes ; rediger
 * et diffuser demandent `newsletter.send`, qui est sensible : une campagne part
 * chez toutes les adresses confirmees, et ne se rattrape pas.
 */

export const load: PageServerLoad = async ({ locals }) => {
	const user = requirePermission(locals.user, 'newsletter.read');

	const campaigns = await prisma.newsletterCampaign.findMany({
		orderBy: { createdAt: 'desc' },
		select: {
			id: true,
			subject: true,
			status: true,
			sentAt: true,
			updatedAt: true,
			recipientCount: true,
			deliveredCount: true,
			bouncedCount: true,
			complainedCount: true
		}
	});

	return { campaigns, writable: can(user, 'newsletter.send') };
};

export const actions: Actions = {
	create: async ({ locals }) => {
		const user = requirePermission(locals.user, 'newsletter.send');

		const campaign = await prisma.newsletterCampaign.create({
			data: { subject: 'Nouvelle campagne', markdown: '', createdById: user.id },
			select: { id: true }
		});

		await recordAudit({
			actorId: user.id,
			action: 'newsletter.campaign.create',
			entity: 'NewsletterCampaign',
			entityId: campaign.id
		});

		redirect(303, `/admin/infolettre/campagnes/${campaign.id}`);
	}
};
