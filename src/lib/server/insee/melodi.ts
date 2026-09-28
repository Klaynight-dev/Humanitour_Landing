import { z } from 'zod';

/**
 * Client de l API Melodi de l Insee (`https://api.insee.fr/melodi`).
 *
 * Melodi diffuse les jeux de donnees de l Insee, dont les tableaux detailles du
 * recensement de la population. L acces est public : ni cle, ni compte, et un
 * quota de trente requetes par minute que ce depot respecte en appelant trois
 * jeux au plus, puis en gardant le resultat en memoire (`census.ts`).
 *
 * Appele depuis le serveur seulement : le back-office ne fait jamais sortir le
 * navigateur d un membre de l equipe vers un domaine tiers, et le cache profite
 * a tous les onglets.
 */

export const MELODI_URL = 'https://api.insee.fr/melodi';

/**
 * Taille de page demandee.
 *
 * Le plafond documente est de 10 000 observations : les trois tableaux dont on
 * a besoin tiennent chacun en une page, mais le client suit la pagination au
 * cas ou un filtre plus large la rendrait necessaire.
 */
const PAGE_SIZE = 10_000;

/** Au-dela, c est un filtre trop large, pas un tableau de marges. */
const MAX_PAGES = 20;

const TIMEOUT_MS = 20_000;

/** Une observation : ses coordonnees dans le cube, et sa valeur. */
export interface MelodiObservation {
	readonly dimensions: Readonly<Record<string, string>>;
	readonly value: number;
}

/**
 * La reponse de `/data/{jeu}`.
 *
 * Seul `OBS_VALUE_NIVEAU` est lu : c est la mesure en niveau (un effectif).
 * Une observation sans valeur (secret statistique, case vide) est ecartee
 * plutot que comptee pour zero.
 */
const pageSchema = z.object({
	observations: z.array(
		z.object({
			dimensions: z.record(z.string(), z.string()),
			measures: z.object({
				OBS_VALUE_NIVEAU: z.object({ value: z.number().nullable() }).optional()
			})
		})
	),
	paging: z.object({ count: z.number().optional() }).optional()
});

export class MelodiError extends Error {
	override readonly name = 'MelodiError';
}

/** Filtres de dimension : plusieurs valeurs pour une dimension = « ou ». */
export type MelodiFilters = Readonly<Record<string, readonly string[]>>;

/** Ce que le client demande a `fetch`, et rien de plus : un double de test s y branche. */
export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

export function dataUrl(dataset: string, filters: MelodiFilters, page: number): string {
	const params = new URLSearchParams();
	for (const [dimension, values] of Object.entries(filters)) {
		for (const value of values) params.append(dimension, value);
	}
	params.set('maxResult', String(PAGE_SIZE));
	params.set('totalCount', 'TRUE');
	params.set('page', String(page));

	return `${MELODI_URL}/data/${encodeURIComponent(dataset)}?${params}`;
}

/**
 * Toutes les observations d un jeu, pour les filtres donnes.
 *
 * L API ne renvoie pas de lien vers la page suivante, seulement le nombre total
 * d observations (`paging.count`) : on demande donc les pages une a une tant
 * qu il en manque.
 */
export async function fetchObservations(
	dataset: string,
	filters: MelodiFilters,
	fetcher: Fetcher = fetch
): Promise<MelodiObservation[]> {
	const observations: MelodiObservation[] = [];

	for (let page = 1; page <= MAX_PAGES; page += 1) {
		const parsed = await fetchPage(dataset, filters, page, fetcher);

		for (const observation of parsed.observations) {
			const value = observation.measures.OBS_VALUE_NIVEAU?.value;
			if (typeof value === 'number') observations.push({ dimensions: observation.dimensions, value });
		}

		const expected = parsed.paging?.count ?? 0;
		const received = page * PAGE_SIZE;
		if (parsed.observations.length < PAGE_SIZE || received >= expected) return observations;
	}

	throw new MelodiError(
		`Le jeu ${dataset} dépasse ${MAX_PAGES} pages : le filtre est trop large pour des marges.`
	);
}

async function fetchPage(
	dataset: string,
	filters: MelodiFilters,
	page: number,
	fetcher: Fetcher
): Promise<z.infer<typeof pageSchema>> {
	let response: Response;
	try {
		response = await fetcher(dataUrl(dataset, filters, page), {
			headers: { accept: 'application/json' },
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
	} catch (cause) {
		throw new MelodiError(`L'API Melodi de l'Insee ne répond pas (${describe(cause)}).`, { cause });
	}

	if (response.status === 429) {
		throw new MelodiError(
			"L'API Melodi limite le nombre de requêtes : réessayez dans une minute."
		);
	}
	if (!response.ok) {
		throw new MelodiError(`L'API Melodi a répondu ${response.status} pour le jeu ${dataset}.`);
	}

	const parsed = pageSchema.safeParse(await response.json().catch(() => null));
	if (!parsed.success) {
		throw new MelodiError(`Réponse de l'API Melodi illisible pour le jeu ${dataset}.`);
	}

	return parsed.data;
}

function describe(cause: unknown): string {
	if (cause instanceof Error && cause.name === 'TimeoutError') return 'délai dépassé';
	return cause instanceof Error ? cause.message : 'erreur réseau';
}
