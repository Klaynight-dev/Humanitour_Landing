/**
 * Redressement par calage sur marges (raking ratio).
 *
 * CE FICHIER EST UNE EXCEPTION ASSUMEE. La regle du depot etait « pas de
 * ponderation, meme pour corriger l'echantillon », parce que le redressement
 * opaque est le reproche central adresse aux instituts. Elle a ete revisee le
 * 20 septembre 2026, et la condition qu'elle posait tient toujours, mot pour
 * mot : « elle sera un champ explicite, affiche, versionne, jamais un defaut ».
 * D'ou, dans l'ordre :
 *
 *   - les marges cibles sont SAISIES par un operateur, jamais devinees ;
 *   - le poids de chaque repondant est ECRIT en base, donc auditable ;
 *   - le site public affiche les deux lectures, et la brute reste le defaut ;
 *   - le diagnostic du calage est publie avec les chiffres, y compris mauvais.
 *
 * LA METHODE. Le calage iteratif proportionnel (Deming et Stephan, 1940) ajuste
 * les poids variable par variable jusqu'a ce que chaque marge de l'echantillon
 * rejoigne sa cible. Quand il converge sans bornes, il rend exactement
 * l'estimateur de calage de Deville et Sarndal (1992) pour la fonction de
 * distance « raking ratio » (exponentielle), celle de la macro CALMAR de
 * l'Insee : les poids restent strictement positifs, et chaque total marginal
 * est atteint. Il ne demande que les marges — la part des femmes, celle des
 * 18-24 ans — et non le tableau croise complet.
 *
 * LES BORNES. Avec la troncature active, les poids sont ramenes dans [L, U]
 * a chaque passe. Ce n'est plus la methode « logit » bornee de CALMAR, qui
 * deforme la distance pour rester dans l'intervalle : c'est un raking tronque,
 * plus simple, dont le prix est un residu d'ecart aux cibles. Le diagnostic le
 * chiffre, et la note methodologique le dit sous ce nom.
 *
 * CE QU'IL NE FAIT PAS. Il ne cree pas d'information. Si aucun agriculteur n'a
 * ete rencontre, aucun poids ne fera apparaitre son opinion : la modalite reste
 * vide et le diagnostic le dit. Un redressement repare une structure
 * d'echantillon, jamais une absence.
 *
 * LES STRUCTURES. Tableaux types (`Float64Array`, `Int32Array`) et boucles
 * indexees : chaque variable est encodee une fois en indices de modalite, puis
 * les passes ne manipulent plus aucune chaine ni aucune `Map`. Dix mille
 * repondants, quatre variables et cent iterations tiennent en quelques
 * dizaines de millisecondes.
 */

/** Un repondant, reduit a ce dont le calage a besoin. */
export interface WeightingUnit {
	readonly id: string;
	/** Modalite du repondant pour chaque variable de calage, par code de question. */
	readonly modalities: ReadonlyMap<string, string>;
}

/** Une variable de calage et ses parts cibles, par cle de modalite. */
export interface WeightingVariable {
	readonly questionCode: string;
	/** Parts de la population, entre 0 et 1, de somme 1. */
	readonly targets: ReadonlyMap<string, number>;
}

export interface WeightingOptions {
	/** Arret quand l'ecart maximal a la cible passe sous ce seuil (epsilon). */
	readonly tolerance?: number;
	readonly maxIterations?: number;
	/**
	 * Troncature des poids. Active par defaut.
	 *
	 * Un poids de quarante fait d'un repondant quarante personnes : son opinion
	 * seule deplace le resultat de plusieurs points, et une modalite rare devient
	 * un levier. La troncature borne ce risque, au prix d'un residu d'ecart a la
	 * cible — residu affiche, jamais efface.
	 */
	readonly trim?: boolean;
	/** Borne basse L du poids individuel, lue seulement si `trim`. */
	readonly minWeight?: number;
	/** Borne haute U du poids individuel, lue seulement si `trim`. */
	readonly maxWeight?: number;
}

export const DEFAULT_TOLERANCE = 0.0001;
export const DEFAULT_MAX_ITERATIONS = 100;
export const DEFAULT_MIN_WEIGHT = 0.25;
export const DEFAULT_MAX_WEIGHT = 3.5;

/**
 * Effet de plan au-dela duquel la perte de precision merite une alerte.
 *
 * A 1,5, l'echantillon redresse vaut deux tiers de son effectif : mille
 * repondants en valent six cent soixante-sept. C'est le seuil d'usage des notes
 * de methode, pas une limite legale.
 */
export const DESIGN_EFFECT_ALERT = 1.5;

/** Ce qu'on n'a pas su caler, et pourquoi. Jamais taire. */
export interface WeightingWarning {
	readonly questionCode: string;
	readonly modalityKey: string;
	readonly reason: string;
}

/** Les parametres effectivement utilises, rendus avec le resultat. */
export interface WeightingSettings {
	readonly tolerance: number;
	readonly maxIterations: number;
	readonly trim: boolean;
	readonly minWeight: number;
	readonly maxWeight: number;
}

/** Une ligne de la trace de convergence : l'ecart restant apres l'iteration. */
export interface ConvergenceStep {
	readonly iteration: number;
	readonly maxDeviation: number;
}

export interface WeightingDiagnostics {
	readonly iterations: number;
	readonly converged: boolean;
	/** Ecart maximal restant entre une marge obtenue et sa cible, en part. */
	readonly maxDeviation: number;
	readonly minWeight: number;
	readonly maxWeight: number;
	/**
	 * Taille d'echantillon effective (Kish) : (somme des poids)^2 / somme des carres.
	 *
	 * Le nombre de repondants qu'il aurait fallu, sans ponderation, pour la meme
	 * precision. Toujours inferieure a l'effectif reel : redresser coute de la
	 * precision, et ce chiffre dit combien.
	 */
	readonly effectiveSampleSize: number;
	/** Effet de plan de Kish : 1 + CV(w)^2, soit n / n_eff. */
	readonly designEffect: number;
	/** Coefficient de variation des poids (ecart-type / moyenne, variance de population). */
	readonly coefficientOfVariation: number;
	/** Rapport w_max / w_min. `null` si un poids est nul. */
	readonly weightRatio: number | null;
	/** Repondants dont le poids touche une borne de troncature. */
	readonly atBounds: number;
	readonly respondents: number;
	readonly warnings: readonly WeightingWarning[];
	/** Ecart maximal apres chaque iteration, dans l'ordre. */
	readonly history: readonly ConvergenceStep[];
	/** `null` pour un calcul anterieur a leur enregistrement. */
	readonly settings: WeightingSettings | null;
}

export interface WeightingResult {
	/** Poids par identifiant de repondant. Moyenne ramenee a 1. */
	readonly weights: ReadonlyMap<string, number>;
	readonly diagnostics: WeightingDiagnostics;
}

/**
 * Normalise des parts saisies a la main.
 *
 * Une somme nulle n'est pas une intention mais une saisie vide : elle rend une
 * table vide, que l'appelant doit refuser.
 */
export function normalizeTargets(targets: ReadonlyMap<string, number>): Map<string, number> {
	const usable = [...targets].filter(([, share]) => Number.isFinite(share) && share > 0);
	const total = usable.reduce((sum, [, share]) => sum + share, 0);

	if (total <= 0) return new Map();
	return new Map(usable.map(([key, share]) => [key, share / total]));
}

/**
 * Une variable, encodee en indices.
 *
 * `codes[i]` est l'indice de la modalite du repondant i, ou -1 s'il n'en a pas.
 * Les modalites ciblees viennent en tete ; une modalite observee mais non ciblee
 * recoit un indice dont la cible vaut `NaN` : ses repondants gardent leur poids.
 */
interface EncodedVariable {
	readonly questionCode: string;
	readonly keys: readonly string[];
	readonly codes: Int32Array;
	readonly targets: Float64Array;
	/** Tampon des sommes de poids par modalite, reutilise a chaque passe. */
	readonly sums: Float64Array;
}

function encode(units: readonly WeightingUnit[], variable: WeightingVariable): EncodedVariable {
	const index = new Map<string, number>();
	const keys: string[] = [];
	const targetValues: number[] = [];

	for (const [key, share] of variable.targets) {
		index.set(key, keys.length);
		keys.push(key);
		targetValues.push(share);
	}

	const codes = new Int32Array(units.length);
	for (let i = 0; i < units.length; i += 1) {
		const key = units[i]!.modalities.get(variable.questionCode);
		if (key === undefined) {
			codes[i] = -1;
			continue;
		}
		let code = index.get(key);
		if (code === undefined) {
			code = keys.length;
			index.set(key, code);
			keys.push(key);
			targetValues.push(Number.NaN);
		}
		codes[i] = code;
	}

	return {
		questionCode: variable.questionCode,
		keys,
		codes,
		targets: Float64Array.from(targetValues),
		sums: new Float64Array(keys.length)
	};
}

/** Somme des poids par modalite, ecrite dans `variable.sums`. Rend le total classe. */
function sumBy(variable: EncodedVariable, weights: Float64Array): number {
	const { codes, sums } = variable;
	sums.fill(0);
	let total = 0;

	for (let i = 0; i < codes.length; i += 1) {
		const code = codes[i]!;
		if (code < 0) continue;
		sums[code]! += weights[i]!;
		total += weights[i]!;
	}

	return total;
}

/**
 * Une passe de calage, pour une seule variable.
 *
 * Chaque repondant est multiplie par le rapport entre la part visee et la part
 * observee de sa modalite. Un repondant dont la modalite est observee mais non
 * ciblee garde son poids : le ramener a zero le supprimerait de l'enquete au
 * motif qu'on n'a pas de chiffre de population pour lui.
 */
function adjustFor(variable: EncodedVariable, weights: Float64Array, factors: Float64Array): void {
	const total = sumBy(variable, weights);
	if (total <= 0) return;

	const { codes, sums, targets } = variable;
	for (let code = 0; code < targets.length; code += 1) {
		const target = targets[code]!;
		const observed = sums[code]!;
		factors[code] = target > 0 && observed > 0 ? (target * total) / observed : 1;
	}

	for (let i = 0; i < codes.length; i += 1) {
		const code = codes[i]!;
		if (code >= 0) weights[i]! *= factors[code]!;
	}
}

/**
 * Ramene la moyenne a 1 ET respecte les bornes, en alternant les deux.
 *
 * Les deux contraintes se contrarient : ecreter fait baisser la somme, la
 * remettre a l'effectif fait remonter les poids ecretes. Les appliquer une fois
 * chacune ne suffit donc pas — une premiere version le faisait, et le poids
 * plafonne a 5 ressortait a 20 apres la remise a l'echelle. En alternant, la
 * suite converge : les poids libres absorbent ce que les poids bornes ne
 * peuvent pas porter.
 *
 * Sans troncature, `floor` vaut 0 et `ceiling` l'infini : il ne reste que la
 * remise a l'echelle, en une passe.
 */
function normalizeAndClip(weights: Float64Array, floor: number, ceiling: number): void {
	const size = weights.length;

	// Vingt passes : la suite converge en quelques tours, et une configuration
	// impossible (plancher au-dessus de 1, plafond en dessous) ne doit pas
	// boucler indefiniment. Le diagnostic rendra l'ecart restant.
	for (let pass = 0; pass < 20; pass += 1) {
		let total = 0;
		for (let i = 0; i < size; i += 1) total += weights[i]!;
		if (total <= 0) return;

		const scale = size / total;
		let clipped = false;

		for (let i = 0; i < size; i += 1) {
			const scaled = weights[i]! * scale;
			const bounded = scaled < floor ? floor : scaled > ceiling ? ceiling : scaled;
			if (bounded !== scaled) clipped = true;
			weights[i] = bounded;
		}

		if (!clipped) return;
	}
}

/** Ecart maximal entre une marge obtenue et sa cible, toutes variables confondues. */
function deviationOf(variables: readonly EncodedVariable[], weights: Float64Array): number {
	let worst = 0;

	for (const variable of variables) {
		const total = sumBy(variable, weights);
		if (total <= 0) continue;

		for (let code = 0; code < variable.targets.length; code += 1) {
			const target = variable.targets[code]!;
			if (Number.isNaN(target)) continue;
			worst = Math.max(worst, Math.abs(variable.sums[code]! / total - target));
		}
	}

	return worst;
}

/** Les cibles qu'aucun repondant ne peut porter. Relevees une fois, avant le calage. */
function unreachableTargets(variables: readonly EncodedVariable[]): WeightingWarning[] {
	const warnings: WeightingWarning[] = [];

	for (const variable of variables) {
		const present = new Uint8Array(variable.keys.length);
		for (const code of variable.codes) if (code >= 0) present[code] = 1;

		for (let code = 0; code < variable.targets.length; code += 1) {
			if (variable.targets[code]! > 0 && present[code] === 0) {
				warnings.push({
					questionCode: variable.questionCode,
					modalityKey: variable.keys[code]!,
					reason: 'aucun répondant dans cette modalité : la cible ne peut pas être atteinte'
				});
			}
		}
	}

	return warnings;
}

function settingsOf(options: WeightingOptions): WeightingSettings {
	return {
		tolerance: options.tolerance ?? DEFAULT_TOLERANCE,
		maxIterations: options.maxIterations ?? DEFAULT_MAX_ITERATIONS,
		trim: options.trim ?? true,
		minWeight: options.minWeight ?? DEFAULT_MIN_WEIGHT,
		maxWeight: options.maxWeight ?? DEFAULT_MAX_WEIGHT
	};
}

/**
 * Cale les poids sur les marges.
 *
 * Un repondant dont la modalite est inconnue pour une variable — il n'a pas
 * repondu a la question de calage — n'est pas exclu : il garde son poids
 * courant pour cette variable. L'exclure le ferait disparaitre du jeu de
 * donnees pour une case non cochee. Le back-office exige d'ailleurs qu'on
 * l'ait constate avant de lancer le calcul (`weighting-plan.ts`).
 */
export function rake(
	units: readonly WeightingUnit[],
	variables: readonly WeightingVariable[],
	options: WeightingOptions = {}
): WeightingResult {
	const settings = settingsOf(options);
	const floor = settings.trim ? settings.minWeight : 0;
	const ceiling = settings.trim ? settings.maxWeight : Number.POSITIVE_INFINITY;

	const weights = new Float64Array(units.length).fill(1);

	// Rien a caler : des poids a 1, et un diagnostic qui le dit plutot qu'un
	// resultat qui aurait l'air d'un redressement.
	if (units.length === 0 || variables.length === 0) {
		return result(units, weights, {
			iterations: 0,
			maxDeviation: 0,
			converged: true,
			warnings: [],
			history: [],
			settings,
			bounds: null
		});
	}

	const encoded = variables.map((variable) => encode(units, variable));
	const factors = new Float64Array(Math.max(...encoded.map((variable) => variable.keys.length)));
	const warnings = unreachableTargets(encoded);
	const history: ConvergenceStep[] = [];

	let iterations = 0;
	let maxDeviation = Number.POSITIVE_INFINITY;

	while (iterations < settings.maxIterations) {
		iterations += 1;

		for (const variable of encoded) {
			adjustFor(variable, weights, factors);
			// L'ecretage s'applique a chaque passe et non a la fin : sans lui, les
			// poids extremes se renforcent d'une iteration a l'autre.
			normalizeAndClip(weights, floor, ceiling);
		}

		maxDeviation = deviationOf(encoded, weights);
		history.push({ iteration: iterations, maxDeviation });
		if (maxDeviation <= settings.tolerance) break;
	}

	// Moyenne ramenee a 1 : la somme des poids redonne l'effectif de l'enquete,
	// et un effectif redresse reste comparable a l'effectif brut.
	normalizeAndClip(weights, floor, ceiling);

	return result(units, weights, {
		iterations,
		maxDeviation,
		converged: maxDeviation <= settings.tolerance,
		warnings,
		history,
		settings,
		bounds: settings.trim ? { floor, ceiling } : null
	});
}

function result(
	units: readonly WeightingUnit[],
	weights: Float64Array,
	run: {
		iterations: number;
		maxDeviation: number;
		converged: boolean;
		warnings: readonly WeightingWarning[];
		history: readonly ConvergenceStep[];
		settings: WeightingSettings;
		bounds: { floor: number; ceiling: number } | null;
	}
): WeightingResult {
	const byId = new Map<string, number>();
	for (let i = 0; i < units.length; i += 1) byId.set(units[i]!.id, weights[i]!);

	return {
		weights: byId,
		diagnostics: {
			iterations: run.iterations,
			converged: run.converged,
			maxDeviation: run.maxDeviation,
			...kish(weights),
			atBounds: countAtBounds(weights, run.bounds),
			respondents: units.length,
			warnings: run.warnings,
			history: run.history,
			settings: run.settings
		}
	};
}

/** Les indicateurs de Kish, et les poids extremes. */
export function kish(weights: ArrayLike<number>): {
	minWeight: number;
	maxWeight: number;
	effectiveSampleSize: number;
	designEffect: number;
	coefficientOfVariation: number;
	weightRatio: number | null;
} {
	const size = weights.length;
	if (size === 0) {
		return {
			minWeight: 0,
			maxWeight: 0,
			effectiveSampleSize: 0,
			designEffect: 1,
			coefficientOfVariation: 0,
			weightRatio: null
		};
	}

	let sum = 0;
	let sumOfSquares = 0;
	let min = Number.POSITIVE_INFINITY;
	let max = Number.NEGATIVE_INFINITY;

	for (let i = 0; i < size; i += 1) {
		const weight = weights[i]!;
		sum += weight;
		sumOfSquares += weight * weight;
		if (weight < min) min = weight;
		if (weight > max) max = weight;
	}

	const effectiveSampleSize = sumOfSquares > 0 ? (sum * sum) / sumOfSquares : 0;
	// n / n_eff = n * somme des carres / somme^2 = 1 + CV^2, variance de population.
	const designEffect = effectiveSampleSize > 0 ? size / effectiveSampleSize : 1;

	return {
		minWeight: min,
		maxWeight: max,
		effectiveSampleSize,
		designEffect,
		coefficientOfVariation: Math.sqrt(Math.max(0, designEffect - 1)),
		weightRatio: min > 0 ? max / min : null
	};
}

function countAtBounds(
	weights: Float64Array,
	bounds: { floor: number; ceiling: number } | null
): number {
	if (!bounds) return 0;

	// Tolerance relative : un poids ramene a 3,5 puis remis a l'echelle peut
	// ressortir a 3,4999999999.
	const low = bounds.floor * (1 + 1e-9);
	const high = bounds.ceiling * (1 - 1e-9);
	let count = 0;

	for (let i = 0; i < weights.length; i += 1) {
		if (weights[i]! <= low || weights[i]! >= high) count += 1;
	}

	return count;
}

/** Une classe de l'histogramme des poids : [from, to[, sauf la derniere, fermee. */
export interface WeightBin {
	readonly from: number;
	readonly to: number;
	readonly count: number;
}

/**
 * Histogramme des poids, en classes de largeur egale.
 *
 * Les bornes partent de 0 : un poids de 0,3 et un poids de 3 se lisent alors a
 * leur vraie distance de zero, et un tas de poids colles au plancher se voit
 * comme tel au lieu d'occuper toute la largeur.
 */
export function weightHistogram(weights: Iterable<number>, binCount = 14): WeightBin[] {
	const values = Float64Array.from(weights);
	if (values.length === 0 || binCount < 1) return [];

	let max = 0;
	for (const value of values) if (value > max) max = value;
	if (max <= 0) return [{ from: 0, to: 0, count: values.length }];

	const width = max / binCount;
	const counts = new Uint32Array(binCount);
	for (const value of values) {
		counts[Math.min(binCount - 1, Math.floor(value / width))]! += 1;
	}

	return [...counts].map((count, index) => ({
		from: index * width,
		to: (index + 1) * width,
		count
	}));
}
