import { protectDistribution, SINGLE_COLUMN_KEY } from '$lib/server/survey/anonymity';

/**
 * Courbes du tableau de bord.
 *
 * Une tranche de date est un agregat de repondants comme un autre : elle passe
 * par la meme couche d anonymat que les croisements publies (AGENTS.md
 * section 4). Un pic a deux reponses un jour donne se masque, sans quoi le
 * back-office publierait en interne ce que le site refuse de publier dehors.
 *
 * Les fonctions de ce fichier sont pures : elles prennent des dates deja lues,
 * jamais un client Prisma. C est ce qui les rend verifiables sans PostgreSQL.
 */

export interface TrendPoint {
	/** Debut de la tranche, au format ISO court (AAAA-MM-JJ). */
	readonly key: string;
	readonly label: string;
	/** `null` des que la tranche est masquee par le seuil d anonymat. */
	readonly count: number | null;
	readonly suppressed: boolean;
}

export interface TrendSeries {
	readonly points: readonly TrendPoint[];
	readonly total: number;
	readonly threshold: number;
	readonly suppressedCount: number;
}

/** Lundi de la semaine contenant cette date, a minuit UTC. */
export function startOfWeek(date: Date): Date {
	const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
	// getUTCDay : 0 = dimanche. La semaine francaise commence le lundi, donc
	// dimanche recule de six jours et non d un seul.
	const shift = (copy.getUTCDay() + 6) % 7;
	copy.setUTCDate(copy.getUTCDate() - shift);
	return copy;
}

function isoDay(date: Date): string {
	return date.toISOString().slice(0, 10);
}

/**
 * Toutes les semaines entre la premiere et la derniere date, sans trou.
 *
 * Une semaine sans reponse vaut zero et reste affichee : un creux sur le terrain
 * est une information, l effacer donnerait une courbe continue trompeuse.
 */
function weekKeysBetween(first: Date, last: Date): string[] {
	const keys: string[] = [];
	const cursor = startOfWeek(first);
	const end = startOfWeek(last);

	while (cursor <= end) {
		keys.push(isoDay(cursor));
		cursor.setUTCDate(cursor.getUTCDate() + 7);
	}

	return keys;
}

const WEEK_LABEL = new Intl.DateTimeFormat('fr-FR', {
	day: 'numeric',
	month: 'short',
	timeZone: 'UTC'
});

/**
 * Repartit des dates de collecte en semaines, puis applique le seuil d anonymat.
 *
 * `threshold` est celui du reglage global, resolu par l appelant : cette
 * fonction ne lit ni la base ni la configuration.
 */
export function weeklyTrend(dates: readonly Date[], threshold: number): TrendSeries {
	if (dates.length === 0) {
		return { points: [], total: 0, threshold, suppressedCount: 0 };
	}

	// Bornes par parcours plutot que par tri ou par `Math.min(...dates)` : le tri
	// serait inutile — on ne lit que les extremes — et l etalement d un grand
	// tableau en arguments deborde la pile.
	let firstTime = Number.POSITIVE_INFINITY;
	let lastTime = Number.NEGATIVE_INFINITY;
	const counts = new Map<string, number>();

	for (const date of dates) {
		const time = date.getTime();
		if (time < firstTime) firstTime = time;
		if (time > lastTime) lastTime = time;

		const key = isoDay(startOfWeek(date));
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}

	const keys = weekKeysBetween(new Date(firstTime), new Date(lastTime));

	const protectedTable = protectDistribution(counts, keys, threshold);
	const byKey = new Map(
		protectedTable.cells
			.filter((cell) => cell.yKey === SINGLE_COLUMN_KEY)
			.map((cell) => [cell.xKey, cell])
	);

	return {
		// `protectDistribution` produit une case par cle : on la lit telle quelle.
		// Surtout pas de repli `?? 0` ici, il rendrait un zero la ou la couche
		// d anonymat a justement rendu `null`, et le masquage ne masquerait plus rien.
		points: keys.map((key) => {
			const cell = byKey.get(key);
			return {
				key,
				label: WEEK_LABEL.format(new Date(`${key}T00:00:00Z`)),
				count: cell ? cell.count : 0,
				suppressed: cell ? cell.suppressed : false
			};
		}),
		total: protectedTable.total,
		threshold,
		suppressedCount: protectedTable.suppressedCount
	};
}
