import type { ModalityDescriptor } from '$lib/shared/questions';
import {
	ADULT_AGE,
	CENSUS_DATASETS,
	ILE_DE_FRANCE,
	METROPOLE,
	METROPOLITAN_REGIONS,
	OLDEST_AGE,
	PCS_GROUPS,
	type CensusReference
} from './census';

/**
 * Des effectifs du recensement aux marges d une question d enquete.
 *
 * Une variable socio-demographique est une question comme les autres (CLAUDE.md,
 * « le modele de donnees ») : ses modalites sont ecrites par l equipe, avec ses
 * mots. Ce fichier reconnait ces mots, range chaque modalite dans une ou
 * plusieurs categories du recensement, et en deduit une part.
 *
 * IL PROPOSE, IL NE DECIDE PAS. La proposition pre-remplit le formulaire ;
 * l analyste la relit, la corrige, et c est son enregistrement qui fait foi.
 * Ce qui n a pas ete reconnu reste vide et dit pourquoi : une part devinee
 * serait une marge inventee sous le nom de l Insee.
 */

export type CensusDimension = 'sexe' | 'age' | 'pcs' | 'region' | 'territoire';

export const DIMENSION_LABELS: Readonly<Record<CensusDimension, string>> = {
	sexe: 'Sexe',
	age: 'Âge',
	pcs: 'Groupe socioprofessionnel (PCS)',
	region: 'Région',
	territoire: 'Île-de-France ou province'
};

/** Une modalite de la question, et ce que le recensement en dit. */
export interface ModalityMatch {
	readonly key: string;
	readonly label: string;
	/** Part proposee, entre 0 et 1. `null` si la modalite n a pas ete rangee. */
	readonly share: number | null;
	/** Categorie du recensement retenue, en toutes lettres. */
	readonly census: string | null;
	/** Pourquoi aucune part n est proposee. */
	readonly reason: string | null;
}

export interface MarginProposal {
	readonly questionCode: string;
	readonly dimension: CensusDimension;
	readonly modalities: readonly ModalityMatch[];
	/** Parts proposees par cle de modalite, de somme 1 sur les modalites rangees. */
	readonly targets: Readonly<Record<string, number>>;
	/** Ce que l analyste doit savoir avant d enregistrer. */
	readonly notes: readonly string[];
}

/** Ce qu une question expose a la reconnaissance. */
export interface MatchableQuestion {
	readonly code: string;
	readonly label: string;
	readonly modalities: readonly ModalityDescriptor[];
}

/**
 * Minuscules, sans accents, ponctuation ramenee a des espaces.
 *
 * Le `+` est garde : « 65+ » est une tranche d age, pas « 65 ».
 */
export function normalizeLabel(text: string): string {
	return text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9+]+/g, ' ')
		.trim();
}

function hasWord(normalized: string, word: string): boolean {
	return ` ${normalized} `.includes(` ${word} `);
}

/** Un mot-cle trouve en debut de mot : « employe » reconnait « employes ». */
function hasPrefix(normalized: string, keyword: string): boolean {
	return ` ${normalized}`.includes(` ${keyword}`);
}

/**
 * Le rangement d une modalite : les « atomes » du recensement qu elle couvre
 * (un sexe, un age revolu, un code de region ou de PCS), ou la raison pour
 * laquelle elle n en couvre aucun.
 */
type Slice =
	| { readonly atoms: readonly string[]; readonly census: string }
	| { readonly atoms: null; readonly reason: string };

interface Matcher {
	/** Rangement de chaque modalite, dans l ordre des modalites. */
	slices(modalities: readonly ModalityDescriptor[]): Slice[];
	/** Effectif du recensement pour un atome. */
	count(atom: string): number;
	/** Tous les atomes du champ, pour signaler ceux qu aucune modalite ne couvre. */
	universe(): readonly string[];
	describeUncovered(atoms: readonly string[]): string;
}

const NOT_RECOGNIZED = 'libellé non reconnu : saisissez la part à la main';

function sexMatcher(reference: CensusReference): Matcher {
	return {
		slices: (modalities) =>
			modalities.map((modality) => {
				const label = normalizeLabel(modality.label);
				if (/^(femmes?|feminin|f)$/.test(label) || hasWord(label, 'femme')) {
					return { atoms: ['F'], census: 'Femmes' };
				}
				if (/^(hommes?|masculin|h|m)$/.test(label) || hasWord(label, 'homme')) {
					return { atoms: ['M'], census: 'Hommes' };
				}
				return {
					atoms: null,
					reason: 'le recensement ne connaît que deux sexes : aucune marge publiée pour cette modalité'
				};
			}),
		count: (atom) => (atom === 'F' ? reference.sex.F : reference.sex.M),
		universe: () => ['F', 'M'],
		describeUncovered: (atoms) =>
			`${atoms.map((atom) => (atom === 'F' ? 'les femmes' : 'les hommes')).join(' et ')}`
	};
}

type AgeRange = { lo: number; hi: number } | { moreThan: number };

/** « 18-24 ans », « de 25 à 34 ans », « 65 ans et plus », « 65+ », « moins de 25 ans ». */
export function parseAgeRange(label: string): AgeRange | null {
	const text = normalizeLabel(label);

	const between = /\b(\d{1,3}) (?:a |et )?(\d{1,3})\b/.exec(text);
	if (between) {
		const lo = Number(between[1]);
		const hi = Number(between[2]);
		if (lo <= hi) return { lo, hi };
	}

	const orMore = /(\d{1,3}) ?(?:ans )?(?:(?:et|ou) (?:plus|\+)|\+)/.exec(text);
	if (orMore) return { lo: Number(orMore[1]), hi: OLDEST_AGE };

	const moreThan = /(?:plus de|au dela de|superieur a) (\d{1,3})/.exec(text);
	if (moreThan) return { moreThan: Number(moreThan[1]) };

	const lessThan = /(?:moins de|inferieur a) (\d{1,3})/.exec(text);
	if (lessThan) return { lo: 0, hi: Number(lessThan[1]) - 1 };

	const orLess = /(\d{1,3}) ans (?:et|ou) moins/.exec(text);
	if (orLess) return { lo: 0, hi: Number(orLess[1]) };

	return null;
}

function formatAges(lo: number, hi: number): string {
	if (hi >= OLDEST_AGE) return `${lo} ans ou plus`;
	if (lo === hi) return `${lo} ans`;
	return `${lo} à ${hi} ans`;
}

/** Des ages revolus consecutifs regroupes en plages lisibles. */
function describeAges(atoms: readonly string[]): string {
	const ages = atoms.map(Number).sort((a, b) => a - b);
	const ranges: string[] = [];
	let start = ages[0]!;

	for (let index = 1; index <= ages.length; index += 1) {
		const current = ages[index];
		if (current === ages[index - 1]! + 1) continue;
		ranges.push(formatAges(start, ages[index - 1]!));
		if (current !== undefined) start = current;
	}

	return ranges.join(', ');
}

function ageMatcher(reference: CensusReference): Matcher {
	return {
		slices: (modalities) => {
			const parsed = modalities.map((modality) => parseAgeRange(modality.label));
			// « Plus de 65 ans » a cote d une tranche « 50 a 65 » commence a 66 ;
			// seul, il se lit comme « 65 ans et plus », l usage courant.
			const upperBounds = new Set(
				parsed.flatMap((range) => (range && 'hi' in range ? [range.hi] : []))
			);

			return parsed.map((range) => {
				if (!range) return { atoms: null, reason: NOT_RECOGNIZED };

				const bounds =
					'moreThan' in range
						? {
								lo: upperBounds.has(range.moreThan) ? range.moreThan + 1 : range.moreThan,
								hi: OLDEST_AGE
							}
						: range;
				const lo = Math.max(bounds.lo, ADULT_AGE);
				const hi = Math.min(bounds.hi, OLDEST_AGE);
				if (hi < lo) {
					return {
						atoms: null,
						reason: `hors du champ : le référentiel ne compte que les ${ADULT_AGE} ans ou plus`
					};
				}

				const atoms: string[] = [];
				for (let age = lo; age <= hi; age += 1) atoms.push(String(age));
				return { atoms, census: formatAges(lo, hi) };
			});
		},
		count: (atom) => reference.ages[Number(atom)] ?? 0,
		universe: () => {
			const atoms: string[] = [];
			for (let age = ADULT_AGE; age <= OLDEST_AGE; age += 1) atoms.push(String(age));
			return atoms;
		},
		describeUncovered: (atoms) => `les ${describeAges(atoms)}`
	};
}

function pcsMatcher(reference: CensusReference): Matcher {
	return {
		slices: (modalities) =>
			modalities.map((modality) => {
				const label = normalizeLabel(modality.label);
				const groups = PCS_GROUPS.filter((group) =>
					group.keywords.some((keyword) => hasPrefix(label, keyword))
				);

				if (groups.length > 0) {
					return {
						atoms: groups.map((group) => group.code),
						census: groups.map((group) => group.label).join(' + ')
					};
				}
				if (/chomeur|chomage|sans emploi|demandeur/.test(label)) {
					return {
						atoms: null,
						reason:
							'le recensement range les chômeurs dans le groupe de leur dernier emploi : pas de marge propre'
					};
				}
				return { atoms: null, reason: NOT_RECOGNIZED };
			}),
		count: (atom) => reference.pcs[atom] ?? 0,
		universe: () => PCS_GROUPS.map((group) => group.code),
		describeUncovered: (atoms) =>
			atoms
				.map((atom) => PCS_GROUPS.find((group) => group.code === atom)?.label ?? atom)
				.join(', ')
	};
}

/** Une modalite qui designe « le reste » du territoire plutot qu une region. */
const ELSEWHERE = /\b(province|hors|autres? regions?|reste|regions)\b/;

const REGION_ALIASES = METROPOLITAN_REGIONS.flatMap((region) =>
	region.aliases.map((alias) => ({ alias, region }))
).sort((a, b) => b.alias.length - a.alias.length);

function regionMatcher(reference: CensusReference): Matcher {
	return {
		slices: (modalities) =>
			modalities.map((modality) => {
				const label = normalizeLabel(modality.label);
				if (ELSEWHERE.test(label)) return { atoms: null, reason: NOT_RECOGNIZED };

				const found = REGION_ALIASES.find(({ alias }) => hasWord(label, alias));
				if (found) return { atoms: [found.region.code], census: found.region.label };

				return {
					atoms: null,
					reason: 'hors de la France métropolitaine, ou libellé non reconnu'
				};
			}),
		count: (atom) => reference.regions[atom] ?? 0,
		universe: () => METROPOLITAN_REGIONS.map((region) => region.code),
		describeUncovered: (atoms) =>
			atoms
				.map((atom) => METROPOLITAN_REGIONS.find((region) => region.code === atom)?.label ?? atom)
				.join(', ')
	};
}

function territoryMatcher(reference: CensusReference): Matcher {
	const province = Object.entries(reference.regions)
		.filter(([code]) => code !== ILE_DE_FRANCE)
		.reduce((sum, [, count]) => sum + count, 0);

	return {
		slices: (modalities) =>
			modalities.map((modality) => {
				const label = normalizeLabel(modality.label);
				if (ELSEWHERE.test(label)) {
					return { atoms: ['province'], census: 'Province (douze régions hors Île-de-France)' };
				}
				if (hasWord(label, 'ile de france') || hasWord(label, 'idf') || hasWord(label, 'paris')) {
					return { atoms: ['idf'], census: 'Île-de-France' };
				}
				return { atoms: null, reason: NOT_RECOGNIZED };
			}),
		count: (atom) => (atom === 'idf' ? (reference.regions[ILE_DE_FRANCE] ?? 0) : province),
		universe: () => ['idf', 'province'],
		describeUncovered: (atoms) =>
			atoms.map((atom) => (atom === 'idf' ? "l'Île-de-France" : 'la province')).join(', ')
	};
}

const MATCHERS: Readonly<Record<CensusDimension, (reference: CensusReference) => Matcher>> = {
	sexe: sexMatcher,
	age: ageMatcher,
	pcs: pcsMatcher,
	region: regionMatcher,
	territoire: territoryMatcher
};

/** Ce que le libelle ou le code de la question annonce. Sert a departager. */
const HINTS: Readonly<Record<CensusDimension, RegExp>> = {
	sexe: /\b(sexe|genre)\b/,
	age: /\b(age|ages|tranche)\b/,
	pcs: /\b(pcs|csp|profession|professionnel|socioprofessionnel|categorie socio|metier)/,
	region: /\b(region|regions|residence|habitez)\b/,
	territoire: /\b(territoire|zone|region|residence|habitez)\b/
};

/** Assemble les parts a partir des rangements. */
function assemble(
	question: MatchableQuestion,
	dimension: CensusDimension,
	matcher: Matcher,
	modalities: readonly ModalityDescriptor[],
	slices: readonly Slice[]
): MarginProposal {
	// Un atome couvert par deux modalites ne peut pas etre partage sans
	// hypothese : « Etudiant » et « Autre inactif » tombent tous deux dans
	// « Autres inactifs », et le recensement ne dit pas comment les separer.
	const owners = new Map<string, number>();
	for (const slice of slices) {
		for (const atom of slice.atoms ?? []) owners.set(atom, (owners.get(atom) ?? 0) + 1);
	}

	const notes: string[] = [];
	const counts = slices.map((slice) => {
		if (slice.atoms === null) return null;
		if (slice.atoms.some((atom) => (owners.get(atom) ?? 0) > 1)) return null;
		return slice.atoms.reduce((sum, atom) => sum + matcher.count(atom), 0);
	});

	const total = counts.reduce<number>((sum, count) => sum + (count ?? 0), 0);
	const targets: Record<string, number> = {};

	const matches = modalities.map((modality, index): ModalityMatch => {
		const slice = slices[index]!;
		const count = counts[index] ?? null;

		if (slice.atoms === null) {
			return { key: modality.key, label: modality.label, share: null, census: null, reason: slice.reason };
		}
		if (count === null) {
			return {
				key: modality.key,
				label: modality.label,
				share: null,
				census: slice.census,
				reason: 'recouvre la même catégorie du recensement qu’une autre modalité : à répartir à la main'
			};
		}

		const share = total > 0 ? count / total : 0;
		targets[modality.key] = share;
		return { key: modality.key, label: modality.label, share, census: slice.census, reason: null };
	});

	const covered = new Set(slices.flatMap((slice) => slice.atoms ?? []));
	const uncovered = matcher.universe().filter((atom) => !covered.has(atom));
	if (uncovered.length > 0) {
		notes.push(
			`Aucune modalité ne couvre ${matcher.describeUncovered(uncovered)} : les parts proposées sont calculées sur les seules catégories présentes, et non sur toute la population.`
		);
	}
	if (matches.some((match) => match.share === null)) {
		notes.push(
			'Une modalité sans part proposée doit recevoir sa cible à la main, sans quoi ses répondants empêchent le calcul.'
		);
	}

	return { questionCode: question.code, dimension, modalities: matches, targets, notes };
}

/**
 * La proposition de marges pour une question, ou `null` si elle ne ressemble
 * a aucune variable du recensement.
 *
 * Chaque dimension essaie de ranger les modalites ; celle qui en range le plus
 * l emporte, le libelle de la question departageant les ex aequo. Il faut au
 * moins deux modalites rangees et la moitie des modalites : une question sur
 * les medias dont une modalite s appellerait « Bretagne » ne devient pas une
 * variable regionale.
 */
export function proposeMargins(
	question: MatchableQuestion,
	reference: CensusReference
): MarginProposal | null {
	const dimension = detectDimension(question);
	if (!dimension) return null;

	const modalities = question.modalities.filter((modality) => !modality.isNonResponse);
	const matcher = MATCHERS[dimension](reference);
	return assemble(question, dimension, matcher, modalities, matcher.slices(modalities));
}

/**
 * Un referentiel vide : la reconnaissance des libelles ne lit aucun effectif,
 * elle peut donc tourner sans avoir appele l Insee.
 */
const NO_COUNTS: CensusReference = {
	period: '',
	fetchedAt: new Date(0).toISOString(),
	adults: 0,
	sex: { F: 0, M: 0 },
	ages: [],
	regions: {},
	pcs: {},
	pcsYoungShare: 0
};

/** La variable du recensement a laquelle ressemble une question, sans appel reseau. */
export function detectDimension(question: MatchableQuestion): CensusDimension | null {
	const modalities = question.modalities.filter((modality) => !modality.isNonResponse);
	if (modalities.length < 2) return null;

	const hint = normalizeLabel(`${question.label} ${question.code}`);
	let best: { dimension: CensusDimension; matched: number; hinted: boolean } | null = null;

	for (const dimension of Object.keys(MATCHERS) as CensusDimension[]) {
		const slices = MATCHERS[dimension](NO_COUNTS).slices(modalities);
		const matched = slices.filter((slice) => slice.atoms !== null).length;
		const hinted = HINTS[dimension].test(hint);

		const better =
			!best || matched > best.matched || (matched === best.matched && hinted && !best.hinted);
		if (better) best = { dimension, matched, hinted };
	}

	if (!best || best.matched < 2 || best.matched * 2 < modalities.length) return null;
	return best.dimension;
}

/**
 * La source, telle qu elle sera publiee avec les chiffres redresses.
 *
 * Elle nomme le millesime, le champ et les tableaux : de quoi refaire le
 * calcul sans nous demander quoi que ce soit.
 */
export function censusSource(reference: CensusReference): string {
	const consulted = new Intl.DateTimeFormat('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	}).format(new Date(reference.fetchedAt));

	return (
		`Insee, recensement de la population ${reference.period} (RP ${reference.period}), ` +
		`France métropolitaine, population de ${ADULT_AGE} ans ou plus. ` +
		`Tableaux ${CENSUS_DATASETS.ageSex.table} et ${CENSUS_DATASETS.pcs.table}, ` +
		`API Melodi, consultée le ${consulted}.`
	);
}

/** Ce qui est ecrit avec une variable dont les cibles viennent du recensement. */
export function censusOrigin(reference: CensusReference, dimension: CensusDimension) {
	return {
		provider: 'insee-melodi' as const,
		datasets:
			dimension === 'pcs'
				? [CENSUS_DATASETS.pcs.id, CENSUS_DATASETS.ageSex.id]
				: [CENSUS_DATASETS.ageSex.id],
		period: reference.period,
		geo: METROPOLE,
		dimension,
		fetchedAt: reference.fetchedAt
	};
}
