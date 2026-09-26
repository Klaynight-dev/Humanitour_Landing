import { buildOutcome, type ExploreInputs } from './explore';
import type { Population } from './population';

/**
 * L evolution d une question au fil du terrain, semaine par semaine.
 *
 * C est la courbe annoncee par la decision 6 de `CLAUDE.md`. La donnee existait
 * deja : chaque reponse porte sa date de recueil (`Response.collectedAt`).
 *
 * UNE SEMAINE EST UN PANNEAU. Le calcul ne refait rien : il decoupe la
 * population par semaine et demande a `buildOutcome` la distribution de chaque
 * morceau, exactement comme `buildPanels` le fait par modalite. Tout ce que ce
 * calcul sait deja faire vaut donc ici sans une ligne de plus : non-reponses
 * comptees, lecture redressee, masquage des petites cases.
 *
 * Et surtout, le seuil d anonymat s applique a CHAQUE SEMAINE. C est le point
 * sensible : decouper le terrain en semaines divise l echantillon, et une
 * semaine creuse peut ne designer qu une poignee de personnes rencontrees le
 * meme jour au meme endroit. Une semaine sous le seuil ne publie rien, pas meme
 * son effectif.
 *
 * Pourquoi la SEMAINE : deux mois de terrain et un millier d entretiens donnent
 * une quinzaine de reponses par jour. Au jour, la plupart des points tomberaient
 * sous le seuil et la courbe serait trouee de partout ; au mois, deux points ne
 * font pas une evolution.
 */

export interface TimelinePeriod {
	/** Semaine ISO, `2026-W33`. Stable : elle sert de cle et d ancre. */
	readonly key: string;
	/** Lundi de la semaine, a minuit UTC. */
	readonly start: Date;
	/** Repondants de la semaine. `null` quand le seuil interdit de le publier. */
	readonly respondents: number | null;
}

export interface TimelineSeries {
	readonly key: string;
	readonly label: string;
	readonly isNonResponse: boolean;
	readonly color: string | null;
	/**
	 * Part de la modalite, une valeur par periode, dans l ordre de `periods`.
	 *
	 * `null` quand la semaine est sous le seuil ou que la case l est. C est un
	 * TROU, jamais un zero : tracer zero dirait qu il n y a eu personne, alors
	 * qu on refuse seulement de dire combien.
	 */
	readonly shares: readonly (number | null)[];
}

export interface TimelineResult {
	readonly periods: readonly TimelinePeriod[];
	readonly series: readonly TimelineSeries[];
	readonly threshold: number;
	/** Semaines entierement masquees par le seuil. */
	readonly suppressedPeriods: number;
}

const JOUR_MS = 86_400_000;

/**
 * La semaine ISO 8601 d une date : celle qui contient son jeudi.
 *
 * En UTC, jamais en heure locale : un entretien recueilli a 23 h 30 un dimanche
 * a Paris tomberait sinon dans une semaine differente selon le fuseau du
 * serveur qui calcule, et deux exports du meme resultat divergeraient.
 */
export function isoWeek(date: Date): { key: string; start: Date } {
	const jour = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
	// Lundi = 0 ... dimanche = 6.
	const rang = (new Date(jour).getUTCDay() + 6) % 7;
	const lundi = jour - rang * JOUR_MS;
	const jeudi = lundi + 3 * JOUR_MS;

	const annee = new Date(jeudi).getUTCFullYear();
	const premierJeudi = Date.UTC(annee, 0, 4);
	const lundiSemaine1 = premierJeudi - ((new Date(premierJeudi).getUTCDay() + 6) % 7) * JOUR_MS;
	const numero = Math.round((lundi - lundiSemaine1) / (7 * JOUR_MS)) + 1;

	return { key: `${annee}-W${String(numero).padStart(2, '0')}`, start: new Date(lundi) };
}

/** La population courante, restreinte aux repondants d une semaine. */
function narrowTo(population: Population, ids: ReadonlySet<string>): Population {
	return {
		includes: (id) => ids.has(id),
		size: ids.size,
		total: population.total,
		restricted: true
	};
}

/**
 * Construit l evolution d une question.
 *
 * `y` est ignore : une evolution croise deja une question avec le temps, un
 * second axe en ferait un croisement a trois variables que la courbe ne sait
 * pas montrer honnetement. Pour cela, il y a les petits multiples.
 *
 * Les semaines sont CONTIGUES, de la premiere a la derniere observee : une
 * semaine sans entretien au milieu du terrain apparait, masquee, plutot que de
 * disparaitre. Sans elle, la courbe relierait deux points eloignes d un trait
 * continu et ferait croire a une evolution reguliere.
 */
export function buildTimeline(
	inputs: ExploreInputs,
	collectedAt: ReadonlyMap<string, Date>
): TimelineResult {
	const { population, threshold, includeNonResponses } = inputs;

	const parSemaine = grouperParSemaine(collectedAt, population);
	const periodes = semainesContigues([...parSemaine.values()].map((groupe) => groupe.start));

	const modalites = inputs.x.modalities.filter(
		(modality) => includeNonResponses || !modality.isNonResponse
	);
	const parts = new Map<string, (number | null)[]>(modalites.map((m) => [m.key, []]));
	const couleurs = new Map<string, string | null>(modalites.map((m) => [m.key, null]));

	let suppressedPeriods = 0;
	const periods: TimelinePeriod[] = [];

	for (const periode of periodes) {
		const ids = parSemaine.get(periode.key)?.ids ?? new Set<string>();
		const outcome = buildOutcome({
			...inputs,
			y: null,
			population: narrowTo(population, ids)
		});

		if (outcome.kind !== 'distribution') {
			// Sous le seuil, ou vide : la semaine existe, elle ne dit rien.
			suppressedPeriods += 1;
			periods.push({ key: periode.key, start: periode.start, respondents: null });
			for (const valeurs of parts.values()) valeurs.push(null);
			continue;
		}

		periods.push({
			key: periode.key,
			start: periode.start,
			respondents: outcome.distribution.respondents
		});

		const barres = new Map(outcome.distribution.bars.map((bar) => [bar.key, bar]));
		for (const [cle, valeurs] of parts) {
			const barre = barres.get(cle);
			valeurs.push(barre?.share ?? null);
			if (barre?.color && !couleurs.get(cle)) couleurs.set(cle, barre.color);
		}
	}

	return {
		periods,
		series: modalites.map((modality) => ({
			key: modality.key,
			label: modality.label,
			isNonResponse: modality.isNonResponse,
			color: couleurs.get(modality.key) ?? null,
			shares: parts.get(modality.key) ?? []
		})),
		threshold,
		suppressedPeriods
	};
}

/** Les repondants de la population, ranges par semaine ISO. */
function grouperParSemaine(
	collectedAt: ReadonlyMap<string, Date>,
	population: Population
): Map<string, { start: Date; ids: Set<string> }> {
	const groupes = new Map<string, { start: Date; ids: Set<string> }>();

	for (const [id, date] of collectedAt) {
		if (!population.includes(id)) continue;
		const semaine = isoWeek(date);
		const groupe = groupes.get(semaine.key);
		if (groupe) groupe.ids.add(id);
		else groupes.set(semaine.key, { start: semaine.start, ids: new Set([id]) });
	}

	return groupes;
}

/** Toutes les semaines ISO de la premiere a la derniere, trous compris. */
function semainesContigues(debuts: readonly Date[]): { key: string; start: Date }[] {
	if (debuts.length === 0) return [];

	const temps = debuts.map((date) => date.getTime());
	const premiere = Math.min(...temps);
	const derniere = Math.max(...temps);

	const semaines: { key: string; start: Date }[] = [];
	for (let lundi = premiere; lundi <= derniere; lundi += 7 * JOUR_MS) {
		semaines.push(isoWeek(new Date(lundi)));
	}
	return semaines;
}
