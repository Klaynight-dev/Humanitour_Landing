import {
	fetchObservations,
	MelodiError,
	type Fetcher,
	type MelodiObservation
} from './melodi';

/**
 * Le referentiel du recensement de la population (RP), lu chez l Insee.
 *
 * Aucune part n est ecrite dans ce fichier : elles sont toutes recalculees a
 * partir des effectifs que publie l Insee via Melodi. Ce qui est ecrit ici, ce
 * sont les NOMENCLATURES (codes de region, groupes de PCS) et le champ retenu :
 * la France metropolitaine, parce que le tour d Humanitour a traverse les
 * treize regions metropolitaines, et la population de 18 ans ou plus, parce
 * que c est elle qui vote.
 *
 * DEUX TABLEAUX suffisent :
 *
 *   - POP1, population par sexe et age detaille (annee par annee, 100 ans et
 *     plus regroupes) : il donne le sexe, n importe quel decoupage en tranches
 *     d age, et, lu region par region, la marge regionale ;
 *   - POP6, population de 15 ans ou plus par groupe socioprofessionnel et
 *     tranche quinquennale d age : il donne la PCS.
 */

export const CENSUS_DATASETS = {
	ageSex: {
		id: 'DS_RP_TD_POPULATION_AGESEX_PRINC',
		table: 'POP1',
		label: 'Population détaillée par sexe et âge'
	},
	pcs: {
		id: 'DS_RP_TD_POPULATION_PCSAGESEX_COMP',
		table: 'POP6',
		label: 'Population selon l’âge et la PCS'
	}
} as const;

/** France metropolitaine, dans la geographie de Melodi. */
export const METROPOLE = 'FRANCE-FM';

export const ADULT_AGE = 18;
/** POP1 regroupe « 100 ans ou plus » sous `Y_GE100`, range ici a l age 100. */
export const OLDEST_AGE = 100;

/**
 * Les treize regions metropolitaines, par code officiel.
 *
 * Les alias servent a reconnaitre une modalite ecrite a la main (« PACA »,
 * « Centre »). Ils sont essayes du plus long au plus court, pour que
 * « Centre-Val de Loire » ne soit pas pris pour un simple « Centre » ambigu.
 */
export const METROPOLITAN_REGIONS: readonly {
	readonly code: string;
	readonly label: string;
	readonly aliases: readonly string[];
}[] = [
	{ code: '11', label: 'Île-de-France', aliases: ['ile de france', 'idf', 'region parisienne'] },
	{ code: '24', label: 'Centre-Val de Loire', aliases: ['centre val de loire', 'centre'] },
	{
		code: '27',
		label: 'Bourgogne-Franche-Comté',
		aliases: ['bourgogne franche comte', 'bourgogne']
	},
	{ code: '28', label: 'Normandie', aliases: ['normandie'] },
	{ code: '32', label: 'Hauts-de-France', aliases: ['hauts de france'] },
	{ code: '44', label: 'Grand Est', aliases: ['grand est'] },
	{ code: '52', label: 'Pays de la Loire', aliases: ['pays de la loire'] },
	{ code: '53', label: 'Bretagne', aliases: ['bretagne'] },
	{ code: '75', label: 'Nouvelle-Aquitaine', aliases: ['nouvelle aquitaine'] },
	{ code: '76', label: 'Occitanie', aliases: ['occitanie'] },
	{ code: '84', label: 'Auvergne-Rhône-Alpes', aliases: ['auvergne rhone alpes'] },
	{
		code: '93',
		label: "Provence-Alpes-Côte d'Azur",
		aliases: ['provence alpes cote d azur', 'paca', 'provence']
	},
	{ code: '94', label: 'Corse', aliases: ['corse'] }
];

export const ILE_DE_FRANCE = '11';

/**
 * Les groupes socioprofessionnels de POP6.
 *
 * L Insee harmonise PCS 2003 et PCS 2020 en une seule dimension a huit
 * postes. Le chomeur ayant deja travaille est range dans le groupe de son
 * dernier emploi ; l etudiant et la personne au foyer, dans « Autres
 * inactifs ». Les mots-cles reconnaissent les libelles usuels d un
 * questionnaire.
 */
export const PCS_GROUPS: readonly {
	readonly code: string;
	readonly label: string;
	readonly keywords: readonly string[];
}[] = [
	{ code: '1', label: 'Agriculteurs exploitants', keywords: ['agricult', 'exploitant agricole'] },
	{
		code: '2',
		label: 'Artisans, commerçants et chefs d’entreprise',
		keywords: ['artisan', 'commercant', 'chef d entreprise', 'chefs d entreprise']
	},
	{
		code: '3',
		label: 'Cadres et professions intellectuelles supérieures',
		keywords: ['cadre', 'intellectuelle', 'profession liberale', 'professions liberales']
	},
	{ code: '4', label: 'Professions intermédiaires', keywords: ['intermediaire'] },
	{ code: '5', label: 'Employés', keywords: ['employe'] },
	{ code: '6', label: 'Ouvriers', keywords: ['ouvrier'] },
	{ code: '7', label: 'Retraités', keywords: ['retraite'] },
	{
		code: '9',
		label: 'Autres personnes sans activité professionnelle',
		keywords: ['inactif', 'sans activite', 'etudiant', 'au foyer', 'eleve']
	}
];

/** Tranches quinquennales de POP6, avec leurs ages extremes. */
const PCS_AGE_BANDS: Readonly<Record<string, readonly [number, number]>> = {
	Y15T19: [15, 19],
	Y20T24: [20, 24],
	Y25T29: [25, 29],
	Y30T34: [30, 34],
	Y35T39: [35, 39],
	Y40T44: [40, 44],
	Y45T49: [45, 49],
	Y50T54: [50, 54],
	Y55T59: [55, 59],
	Y60T64: [60, 64],
	Y_GE65: [65, OLDEST_AGE]
};

export interface CensusReference {
	/** Millesime du recensement : « 2023 » pour le RP 2023. */
	readonly period: string;
	readonly fetchedAt: string;
	/** Population de 18 ans ou plus, France metropolitaine. */
	readonly adults: number;
	readonly sex: { readonly F: number; readonly M: number };
	/** `ages[a]` : population d age revolu a, de 0 a 100 (100 = 100 ans ou plus). */
	readonly ages: readonly number[];
	/** Population de 18 ans ou plus par code de region metropolitaine. */
	readonly regions: Readonly<Record<string, number>>;
	/** Population de 18 ans ou plus par groupe socioprofessionnel. */
	readonly pcs: Readonly<Record<string, number>>;
	/**
	 * Part des 18-19 ans dans la tranche 15-19 de POP6.
	 *
	 * POP6 ne descend pas sous la tranche quinquennale : pour en retirer les
	 * 15-17 ans, on suppose que la repartition par PCS des 15-19 ans ne depend
	 * pas de l age a l interieur de la tranche. L effet est faible (les 18-19
	 * ans font moins de 2 % des adultes) et la note de methode le dit.
	 */
	readonly pcsYoungShare: number;
}

function ageOf(code: string | undefined): number | null {
	if (code === 'Y_GE100') return OLDEST_AGE;
	const match = /^Y(\d+)$/.exec(code ?? '');
	return match ? Number(match[1]) : null;
}

/** Le code d une region, lu dans une geographie Melodi : `2026-REG-53` rend `53`. */
function regionOf(geo: string | undefined): string | null {
	return /REG-(\w+)$/.exec(geo ?? '')?.[1] ?? null;
}

function latestPeriod(observations: readonly MelodiObservation[]): string {
	let latest = '';
	for (const observation of observations) {
		const period = observation.dimensions.TIME_PERIOD ?? '';
		if (period > latest) latest = period;
	}
	return latest;
}

/**
 * Le referentiel, a partir des observations brutes des trois appels.
 *
 * Toutes les observations sont ramenees au millesime le plus recent du tableau
 * national : un jeu qui publierait deux millesimes ne melange pas 2022 et 2023
 * dans la meme marge.
 */
export function buildCensusReference(input: {
	readonly metropole: readonly MelodiObservation[];
	readonly regions: readonly MelodiObservation[];
	readonly pcs: readonly MelodiObservation[];
	readonly fetchedAt: Date;
}): CensusReference {
	const period = latestPeriod(input.metropole);
	const inPeriod = (observation: MelodiObservation) =>
		observation.dimensions.TIME_PERIOD === period;

	const ages = new Array<number>(OLDEST_AGE + 1).fill(0);
	const sex = { F: 0, M: 0 };

	for (const observation of input.metropole.filter(inPeriod)) {
		const age = ageOf(observation.dimensions.AGE);
		if (age === null) continue;

		const code = observation.dimensions.SEX;
		if (code === '_T') ages[age]! += observation.value;
		if ((code === 'F' || code === 'M') && age >= ADULT_AGE) sex[code] += observation.value;
	}

	const adults = ages.slice(ADULT_AGE).reduce((sum, count) => sum + count, 0);
	if (adults <= 0 || sex.F + sex.M <= 0) {
		throw new MelodiError(
			`Le tableau ${CENSUS_DATASETS.ageSex.table} ne contient aucun adulte pour la France métropolitaine.`
		);
	}

	const youngBand = ages.slice(15, 20).reduce((sum, count) => sum + count, 0);
	const pcsYoungShare = youngBand > 0 ? (ages[18]! + ages[19]!) / youngBand : 0;

	return {
		period,
		fetchedAt: input.fetchedAt.toISOString(),
		adults,
		sex,
		ages,
		regions: regionTotals(input.regions.filter(inPeriod)),
		pcs: pcsTotals(input.pcs.filter(inPeriod), pcsYoungShare),
		pcsYoungShare
	};
}

function regionTotals(observations: readonly MelodiObservation[]): Record<string, number> {
	const totals: Record<string, number> = {};

	for (const observation of observations) {
		if (observation.dimensions.SEX !== '_T') continue;
		const age = ageOf(observation.dimensions.AGE);
		const region = regionOf(observation.dimensions.GEO);
		if (age === null || age < ADULT_AGE || region === null) continue;
		totals[region] = (totals[region] ?? 0) + observation.value;
	}

	return totals;
}

function pcsTotals(
	observations: readonly MelodiObservation[],
	youngShare: number
): Record<string, number> {
	const totals: Record<string, number> = {};

	for (const observation of observations) {
		const { SEX: sex, AGE: age, PCS: pcs } = observation.dimensions;
		const band = PCS_AGE_BANDS[age ?? ''];
		if (sex !== '_T' || !band || !pcs || pcs === '_T') continue;

		// La tranche 15-19 ne compte que pour sa part de 18-19 ans.
		const share = band[0] < ADULT_AGE ? youngShare : 1;
		totals[pcs] = (totals[pcs] ?? 0) + observation.value * share;
	}

	return totals;
}

/** Les trois appels a Melodi, en parallele : trois requetes sur un quota de trente par minute. */
export async function fetchCensusReference(
	fetcher: Fetcher = fetch,
	now: Date = new Date()
): Promise<CensusReference> {
	const [metropole, regions, pcs] = await Promise.all([
		fetchObservations(CENSUS_DATASETS.ageSex.id, { GEO: [METROPOLE] }, fetcher),
		fetchObservations(
			CENSUS_DATASETS.ageSex.id,
			{ GEO: METROPOLITAN_REGIONS.map((region) => `REG-${region.code}`), SEX: ['_T'] },
			fetcher
		),
		fetchObservations(CENSUS_DATASETS.pcs.id, { GEO: [METROPOLE], SEX: ['_T'] }, fetcher)
	]);

	return buildCensusReference({ metropole, regions, pcs, fetchedAt: now });
}

/**
 * Un recensement change une fois par an : on garde le referentiel une journee.
 *
 * Le cache vit dans le processus. Il evite de reinterroger l Insee a chaque
 * ouverture de l ecran, et un redemarrage le vide sans consequence.
 */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
let cached: { reference: CensusReference; at: number } | null = null;

export async function loadCensusReference(
	options: { fetcher?: Fetcher; now?: Date; refresh?: boolean } = {}
): Promise<CensusReference> {
	const now = options.now ?? new Date();
	if (!options.refresh && cached && now.getTime() - cached.at < CACHE_TTL_MS) {
		return cached.reference;
	}

	const reference = await fetchCensusReference(options.fetcher, now);
	cached = { reference, at: now.getTime() };
	return reference;
}

/** Pour les tests : repart d un cache vide. */
export function clearCensusCache(): void {
	cached = null;
}
