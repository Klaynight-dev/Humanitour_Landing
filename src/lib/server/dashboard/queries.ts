import { prisma } from '$lib/server/db';
import { DEFAULT_K_THRESHOLD, pickThreshold } from '$lib/server/survey/anonymity';
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

export interface ImportSummary {
	readonly status: string;
	readonly batches: number;
	readonly accepted: number;
	readonly rejected: number;
}

/** Activite d import : volumes et rejets, par statut de lot. */
export async function importActivity(): Promise<ImportSummary[]> {
	const rows = await prisma.importBatch.groupBy({
		by: ['status'],
		_count: { _all: true },
		_sum: { acceptedCount: true, rejectedCount: true }
	});

	return rows.map((row) => ({
		status: row.status,
		batches: row._count._all,
		accepted: row._sum.acceptedCount ?? 0,
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
