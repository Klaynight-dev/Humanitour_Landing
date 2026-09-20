import { prisma } from '$lib/server/db';
import { DEFAULT_K_THRESHOLD, pickThreshold } from '$lib/server/survey/anonymity';
import type { WorkCounts } from '$lib/shared/admin/worklist';
import { weeklyTrend, type TrendSeries } from './trends';

/**
 * Lectures du tableau de bord.
 *
 * Aucune table d agregats pre-calcules : a l echelle des donnees du projet, un
 * comptage a la volee suffit, et un cache serait de l optimisation a l aveugle.
 * Ce fichier ne porte aucune regle, seulement des acces base — la logique qui
 * merite d etre verifiee vit dans `trends.ts`.
 */

/** Seuil d anonymat global, avec repli sur le defaut si le reglage est absent. */
async function globalThreshold(): Promise<number> {
	const setting = await prisma.appSetting.findUnique({ where: { key: 'anonymity.k' } });
	return pickThreshold(null, setting?.value ?? DEFAULT_K_THRESHOLD);
}

/** Collecte hebdomadaire, toutes enquetes confondues, masquage applique. */
export async function responseTrend(): Promise<TrendSeries> {
	const threshold = await globalThreshold();
	const rows = await prisma.response.findMany({ select: { collectedAt: true } });

	return weeklyTrend(
		rows.map((row) => row.collectedAt),
		threshold
	);
}

export interface StatusCount {
	readonly status: string;
	readonly count: number;
}

/** Repartition des enquetes par statut. Donnee de pilotage, sans repondants. */
export async function surveysByStatus(): Promise<StatusCount[]> {
	const rows = await prisma.survey.groupBy({ by: ['status'], _count: { _all: true } });
	return rows.map((row) => ({ status: row.status, count: row._count._all }));
}

/** Repartition des medias par statut. */
export async function mediaByStatus(): Promise<StatusCount[]> {
	const rows = await prisma.mediaItem.groupBy({ by: ['status'], _count: { _all: true } });
	return rows.map((row) => ({ status: row.status, count: row._count._all }));
}

export interface SyncSummary {
	readonly status: string;
	readonly passes: number;
	readonly created: number;
	readonly rejected: number;
}

/**
 * Activite de synchronisation Openforms : passes, reponses reprises et rejets,
 * par issue.
 *
 * Les passes en echec y figurent comme les autres. Une synchronisation qui
 * echoue en silence est le scenario a redouter : les chiffres publies cessent
 * simplement de bouger, sans que rien ne l'indique.
 */
export async function syncActivity(): Promise<SyncSummary[]> {
	const rows = await prisma.openformsSync.groupBy({
		by: ['status'],
		_count: { _all: true },
		_sum: { createdCount: true, rejectedCount: true }
	});

	return rows.map((row) => ({
		status: row.status,
		passes: row._count._all,
		created: row._sum.createdCount ?? 0,
		rejected: row._sum.rejectedCount ?? 0
	}));
}

export interface ActorActivity {
	readonly actor: string;
	readonly actions: number;
}

/**
 * Activite de l equipe sur les trente derniers jours.
 *
 * Le journal montre deja qui a fait quoi, nominativement, a qui detient
 * `audit.read` : ce comptage ne divulgue donc rien de nouveau.
 */
export async function teamActivity(days = 30): Promise<ActorActivity[]> {
	const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

	const rows = await prisma.auditEvent.groupBy({
		by: ['actorId'],
		where: { createdAt: { gte: since } },
		_count: { _all: true },
		orderBy: { _count: { actorId: 'desc' } },
		take: 8
	});

	const actors = await prisma.user.findMany({
		where: { id: { in: rows.map((row) => row.actorId).filter((id): id is string => id !== null) } },
		select: { id: true, displayName: true }
	});
	const names = new Map(actors.map((actor) => [actor.id, actor.displayName]));

	return rows.map((row) => ({
		actor: row.actorId === null ? 'Système' : (names.get(row.actorId) ?? 'Compte supprimé'),
		actions: row._count._all
	}));
}

/**
 * Ce qui attend quelqu'un, en nombres bruts.
 *
 * Les phrases, l'ordre et le filtre de permission vivent dans
 * `shared/admin/worklist.ts` : ici, on compte, et rien d'autre. Les lectures
 * s'enchainent pour la meme raison que le reste du fichier — le pool de
 * connexions, pas la vitesse.
 */
export async function workCounts(): Promise<WorkCounts> {
	const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

	// Seuls les echecs recents comptent : une passe tombee il y a six mois et
	// rattrapee depuis n'est plus une tache, c'est une ligne de journal.
	const syncFailed = await prisma.openformsSync.count({
		where: { status: 'FAILED', startedAt: { gte: since } }
	});

	const mediaLate = await prisma.mediaItem.count({
		where: { status: 'SCHEDULED', publishedAt: { lt: new Date() } }
	});

	// Une page en base ET en brouillon : le site sert encore son modele
	// d'origine alors que quelqu'un l'a deja composee ici.
	const pageUnpublished = await prisma.contentPage.count({ where: { status: 'DRAFT' } });
	const surveyDraft = await prisma.survey.count({ where: { status: 'DRAFT' } });
	const mediaDraft = await prisma.mediaItem.count({ where: { status: 'DRAFT' } });

	return {
		'sync-failed': syncFailed,
		'media-late': mediaLate,
		'page-unpublished': pageUnpublished,
		'survey-draft': surveyDraft,
		'media-draft': mediaDraft
	};
}

export interface PeriodCount {
	readonly total: number;
	readonly current: number;
	readonly previous: number;
}

/**
 * Un total, et les deux fenetres de trente jours qui permettent de le comparer.
 *
 * Un chiffre nu ne dit pas s'il monte. La comparaison porte sur deux periodes
 * de meme duree, jamais sur un pourcentage calcule depuis zero : voir
 * `changeRatio`.
 */
async function overPeriod(
	count: (range: { gte: Date; lt?: Date } | undefined) => Promise<number>
): Promise<PeriodCount> {
	const day = 24 * 60 * 60 * 1000;
	const now = Date.now();
	const start = new Date(now - 30 * day);
	const before = new Date(now - 60 * day);

	const total = await count(undefined);
	const current = await count({ gte: start });
	const previous = await count({ gte: before, lt: start });

	return { total, current, previous };
}

/** Reponses collectees, d'apres la date d'entretien et non la date d'import. */
export function responseCounts(): Promise<PeriodCount> {
	return overPeriod((collectedAt) => prisma.response.count({ where: { collectedAt } }));
}

/** Abonnes a l'infolettre. Un comptage : aucune adresse ne remonte ici. */
export function subscriberCounts(): Promise<PeriodCount> {
	return overPeriod((createdAt) => prisma.newsletterSubscriber.count({ where: { createdAt } }));
}

/** Medias mis en ligne. */
export function mediaCounts(): Promise<PeriodCount> {
	return overPeriod((createdAt) => prisma.mediaItem.count({ where: { createdAt } }));
}
