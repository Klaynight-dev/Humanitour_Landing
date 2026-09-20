import {
	syncActivity,
	mediaByStatus,
	responseTrend,
	surveysByStatus,
	teamActivity
} from '$lib/server/dashboard/queries';
import { prisma } from '$lib/server/db';
import { can } from '$lib/shared/permissions';
import type { PageServerLoad } from './$types';

/**
 * Tableau de bord.
 *
 * Chaque bloc reste conditionne a la permission correspondante : un compte de la
 * redaction n'a pas a savoir combien de reponses ont ete synchronisees. Les chiffres
 * viennent uniquement de la base — aucun traceur, aucun service tiers
 * (AGENTS.md section 6).
 *
 * Les lectures s enchainent au lieu de partir ensemble : a une dizaine de
 * requetes concurrentes, un `Promise.all` epuise le pool de connexions et
 * l ecran tombe en 500. Les gagner en parallele ne ferait economiser que
 * quelques millisecondes sur des comptages.
 */
export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	const readsSurveys = can(user, 'survey.read');
	const readsMedia = can(user, 'media.read');
	const readsAudit = can(user, 'audit.read');

	const surveys = readsSurveys ? await prisma.survey.count() : 0;
	const responses = readsSurveys ? await prisma.response.count() : 0;
	const surveyStatuses = readsSurveys ? await surveysByStatus() : [];
	const trend = readsSurveys ? await responseTrend() : null;
	const syncs = readsSurveys ? await syncActivity() : [];

	const media = readsMedia ? await prisma.mediaItem.count() : 0;
	const mediaStatuses = readsMedia ? await mediaByStatus() : [];

	const team = readsAudit ? await teamActivity() : [];
	const recentAudit = readsAudit
		? await prisma.auditEvent.findMany({
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
		: [];

	return {
		surveys,
		responses,
		surveyStatuses,
		trend,
		syncs,
		media,
		mediaStatuses,
		team,
		recentAudit
	};
};
