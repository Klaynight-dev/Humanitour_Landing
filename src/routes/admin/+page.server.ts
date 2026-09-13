import { can } from '$lib/shared/permissions';
import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

/**
 * Tableau de bord.
 *
 * Chaque bloc est conditionne a la permission correspondante : un compte de la
 * redaction n'a pas a savoir combien de reponses ont ete importees.
 */
export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	const [surveys, publishedSurveys, responses, media, publishedMedia, recentAudit] =
		await Promise.all([
			can(user, 'survey.read') ? prisma.survey.count() : 0,
			can(user, 'survey.read') ? prisma.survey.count({ where: { status: 'PUBLISHED' } }) : 0,
			can(user, 'survey.read') ? prisma.response.count() : 0,
			can(user, 'media.read') ? prisma.mediaItem.count() : 0,
			can(user, 'media.read') ? prisma.mediaItem.count({ where: { status: 'PUBLISHED' } }) : 0,
			can(user, 'audit.read')
				? prisma.auditEvent.findMany({
						orderBy: { createdAt: 'desc' },
						take: 8,
						select: {
							id: true,
							action: true,
							entity: true,
							createdAt: true,
							actor: { select: { displayName: true } }
						}
					})
				: []
		]);

	return { surveys, publishedSurveys, responses, media, publishedMedia, recentAudit };
};
