import {
	mediaCounts,
	responseCounts,
	responseTrend,
	subscriberCounts,
	surveysByStatus,
	syncActivity,
	teamActivity,
	workCounts,
	type PeriodCount
} from '$lib/server/dashboard/queries';
import { prisma } from '$lib/server/db';
import { EMPTY_COUNTS } from '$lib/shared/admin/worklist';
import { can } from '$lib/shared/permissions';
import type { PageServerLoad } from './$types';

/** Un bloc que le compte ne peut pas voir ne se lit pas en base non plus. */
const NO_COUNT: PeriodCount = { total: 0, current: 0, previous: 0 };

/**
 * Tableau de bord.
 *
 * Il repond a trois questions, dans cet ordre : qu'est-ce qui attend quelqu'un,
 * qu'est-ce que je viens faire ici, et ou en est-on. La version precedente ne
 * repondait qu'a la troisieme — elle alignait des totaux, qu'on regarde une
 * fois puis plus jamais.
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
	const readsNewsletter = can(user, 'newsletter.read');

	// Les comptages de la liste « a faire » sont filtres par permission a
	// l'affichage (`buildWorklist`), mais les lire quand meme serait une requete
	// pour rien : un compte de la redaction ne compte pas les sondages.
	const work = canSeeWork(readsSurveys, readsMedia, can(user, 'content.read'))
		? await workCounts()
		: EMPTY_COUNTS;

	const surveys = readsSurveys ? await prisma.survey.count() : 0;
	const surveyStatuses = readsSurveys ? await surveysByStatus() : [];
	const responses = readsSurveys ? await responseCounts() : NO_COUNT;
	const trend = readsSurveys ? await responseTrend() : null;
	const syncs = readsSurveys ? await syncActivity() : [];

	const media = readsMedia ? await mediaCounts() : NO_COUNT;
	const mediaPublished = readsMedia
		? await prisma.mediaItem.count({ where: { status: 'PUBLISHED' } })
		: 0;

	const subscribers = readsNewsletter ? await subscriberCounts() : NO_COUNT;

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
		work,
		surveys,
		surveyStatuses,
		responses,
		trend,
		syncs,
		media,
		mediaPublished,
		subscribers,
		team,
		recentAudit
	};
};

/** Vrai si au moins une des taches comptees peut concerner ce compte. */
function canSeeWork(surveys: boolean, media: boolean, content: boolean): boolean {
	return surveys || media || content;
}
