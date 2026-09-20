/**
 * Redressement par calage sur marges (raking).
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
 * rejoigne sa cible. Il ne demande que les marges — la part des femmes, celle
 * des 18-24 ans — et non le tableau croise complet, qu'aucune source publique
 * ne donne a ce niveau de detail.
 *
 * CE QU'IL NE FAIT PAS. Il ne cree pas d'information. Si aucun agriculteur n'a
 * ete rencontre, aucun poids ne fera apparaitre son opinion : la modalite reste
 * vide et le diagnostic le dit. Un redressement repare une structure
 * d'echantillon, jamais une absence.
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
	/** Arret quand l'ecart maximal a la cible passe sous ce seuil. */
	readonly tolerance?: number;
	readonly maxIterations?: number;
	/**
	 * Bornes du poids individuel.
	 *
	 * Un poids de quarante fait d'un repondant quarante personnes : son opinion
	 * seule deplace le resultat de plusieurs points, et une modalite rare devient
	 * un levier. L'ecretage borne ce risque, au prix d'un residu d'ecart a la
	 * cible — residu affiche, jamais efface.
	 */
	readonly minWeight?: number;
	readonly maxWeight?: number;
}

export const DEFAULT_TOLERANCE = 0.0005;
export const DEFAULT_MAX_ITERATIONS = 50;
export const DEFAULT_MIN_WEIGHT = 0.2;
export const DEFAULT_MAX_WEIGHT = 5;

/** Ce qu'on n'a pas su caler, et pourquoi. Jamais taire. */
export interface WeightingWarning {
	readonly questionCode: string;
	readonly modalityKey: string;
	readonly reason: string;
}

export interface WeightingDiagnostics {
	readonly iterations: number;
	readonly converged: boolean;
	/** Ecart maximal restant entre une marge obtenue et sa cible, en part. */
	readonly maxDeviation: number;
	readonly minWeight: number;
	readonly maxWeight: number;
	/**
	 * Taille d'echantillon effective (Kish).
	 *
	 * Le nombre de repondants qu'il aurait fallu, sans ponderation, pour la meme
	 * precision. Toujours inferieure a l'effectif reel : redresser coute de la
	 * precision, et ce chiffre dit combien.
	 */
	readonly effectiveSampleSize: number;
	readonly respondents: number;
	readonly warnings: readonly WeightingWarning[];
}

export interface WeightingResult {
	/** Poids par identifiant de repondant. Moyenne ramenee a 1. */
	readonly weights: ReadonlyMap<string, number>;
	readonly diagnostics: WeightingDiagnostics;
}

/**
 * Normalise des parts saisies a la main.
 *
 * Un operateur recopie des pourcentages arrondis : leur somme fait 99,8 % ou
 * 100,2 %. Les ramener a 1 est la seule lecture raisonnable de son intention.
 * Une somme nulle, elle, n'est pas une intention mais une saisie vide : elle
 * rend une table vide, que l'appelant doit refuser.
 */
export function normalizeTargets(targets: ReadonlyMap<string, number>): Map<string, number> {
	const usable = [...targets].filter(([, share]) => Number.isFinite(share) && share > 0);
	const total = usable.reduce((sum, [, share]) => sum + share, 0);

	if (total <= 0) return new Map();
	return new Map(usable.map(([key, share]) => [key, share / total]));
}

/** Somme des poids par modalite, pour une variable. */
function marginOf(
	units: readonly WeightingUnit[],
	weights: Map<string, number>,
	questionCode: string
): Map<string, number> {
	const margin = new Map<string, number>();

	for (const unit of units) {
		const key = unit.modalities.get(questionCode);
		if (key === undefined) continue;
		margin.set(key, (margin.get(key) ?? 0) + (weights.get(unit.id) ?? 0));
	}

	return margin;
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
 * Le plafond se lit alors comme ce qu'il est vraiment : « personne ne pese plus
 * de cinq repondants moyens ».
 */
function normalizeAndClip(
	weights: Map<string, number>,
	size: number,
	floor: number,
	ceiling: number
): void {
	// Vingt passes : la suite converge en quelques tours, et une configuration
	// impossible (plancher au-dessus de 1, plafond en dessous) ne doit pas
	// boucler indefiniment. Le diagnostic rendra l'ecart restant.
	for (let pass = 0; pass < 20; pass += 1) {
		const total = [...weights.values()].reduce((sum, value) => sum + value, 0);
		if (total <= 0) return;

		const scale = size / total;
		let clipped = false;

		for (const [id, value] of weights) {
			const scaled = value * scale;
			const bounded = Math.min(ceiling, Math.max(floor, scaled));
			if (bounded !== scaled) clipped = true;
			weights.set(id, bounded);
		}

		if (!clipped) return;
	}
}

/**
 * Une passe de calage, pour une seule variable.
 *
 * Chaque repondant est multiplie par le rapport entre la part visee et la part
 * observee de sa modalite. Un repondant dont la modalite est observee mais non
 * ciblee garde son poids : le ramener a zero le supprimerait de l'enquete au
 * motif qu'on n'a pas de chiffre de population pour lui.
 */
function adjustFor(
	units: readonly WeightingUnit[],
	weights: Map<string, number>,
	variable: WeightingVariable
): void {
	const margin = marginOf(units, weights, variable.questionCode);
	const totalWeight = [...margin.values()].reduce((sum, value) => sum + value, 0);
	if (totalWeight <= 0) return;

	for (const unit of units) {
		const key = unit.modalities.get(variable.questionCode);
		const target = key === undefined ? undefined : variable.targets.get(key);
		const observed = key === undefined ? undefined : margin.get(key);
		if (!target || !observed) continue;

		const factor = (target * totalWeight) / observed;
		weights.set(unit.id, (weights.get(unit.id) ?? 0) * factor);
	}
}

/** Ecart maximal entre une marge obtenue et sa cible, toutes variables confondues. */
function deviationOf(
	units: readonly WeightingUnit[],
	weights: Map<string, number>,
	variables: readonly WeightingVariable[]
): number {
	let worst = 0;

	for (const variable of variables) {
		const margin = marginOf(units, weights, variable.questionCode);
		const total = [...margin.values()].reduce((sum, value) => sum + value, 0);
		if (total <= 0) continue;

		for (const [key, target] of variable.targets) {
			const observed = (margin.get(key) ?? 0) / total;
			worst = Math.max(worst, Math.abs(observed - target));
		}
	}

	return worst;
}

/** Les cibles qu'aucun repondant ne peut porter. Relevees une fois, avant le calage. */
function unreachableTargets(
	units: readonly WeightingUnit[],
	variables: readonly WeightingVariable[]
): WeightingWarning[] {
	const warnings: WeightingWarning[] = [];

	for (const variable of variables) {
		const present = new Set(
			units.flatMap((unit) => unit.modalities.get(variable.questionCode) ?? [])
		);

		for (const [key, share] of variable.targets) {
			if (share > 0 && !present.has(key)) {
				warnings.push({
					questionCode: variable.questionCode,
					modalityKey: key,
					reason: 'aucun répondant dans cette modalité : la cible ne peut pas être atteinte'
				});
			}
		}
	}

	return warnings;
}

/**
 * Cale les poids sur les marges.
 *
 * Un repondant dont la modalite est inconnue pour une variable — il n'a pas
 * repondu a la question de calage — n'est pas exclu : il garde son poids
 * courant pour cette variable. L'exclure le ferait disparaitre du jeu de
 * donnees pour une case non cochee.
 */
export function rake(
	units: readonly WeightingUnit[],
	variables: readonly WeightingVariable[],
	options: WeightingOptions = {}
): WeightingResult {
	const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
	const maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
	const floor = options.minWeight ?? DEFAULT_MIN_WEIGHT;
	const ceiling = options.maxWeight ?? DEFAULT_MAX_WEIGHT;

	const weights = new Map(units.map((unit) => [unit.id, 1]));

	// Rien a caler : des poids a 1, et un diagnostic qui le dit plutot qu'un
	// resultat qui aurait l'air d'un redressement.
	if (units.length === 0 || variables.length === 0) return untouched(weights, units.length);

	const warnings = unreachableTargets(units, variables);

	let iterations = 0;
	let maxDeviation = Number.POSITIVE_INFINITY;

	while (iterations < maxIterations) {
		iterations += 1;

		for (const variable of variables) {
			adjustFor(units, weights, variable);
			// L'ecretage s'applique a chaque passe et non a la fin : sans lui, les
			// poids extremes se renforcent d'une iteration a l'autre.
			normalizeAndClip(weights, units.length, floor, ceiling);
		}

		maxDeviation = deviationOf(units, weights, variables);
		if (maxDeviation <= tolerance) break;
	}

	// Moyenne ramenee a 1 : la somme des poids redonne l'effectif de l'enquete,
	// et un effectif redresse reste comparable a l'effectif brut.
	normalizeAndClip(weights, units.length, floor, ceiling);

	return {
		weights,
		diagnostics: {
			iterations,
			converged: maxDeviation <= tolerance,
			maxDeviation,
			...spread(weights),
			respondents: units.length,
			warnings
		}
	};
}

/** Poids tous a 1 : aucune variable de calage, ou aucun repondant. */
function untouched(weights: Map<string, number>, size: number): WeightingResult {
	return {
		weights,
		diagnostics: {
			iterations: 0,
			converged: true,
			maxDeviation: 0,
			minWeight: size === 0 ? 0 : 1,
			maxWeight: size === 0 ? 0 : 1,
			effectiveSampleSize: size,
			respondents: size,
			warnings: []
		}
	};
}

/** Ce que la distribution des poids coute en precision. */
function spread(weights: ReadonlyMap<string, number>): {
	minWeight: number;
	maxWeight: number;
	effectiveSampleSize: number;
} {
	const values = [...weights.values()];
	const sum = values.reduce((acc, value) => acc + value, 0);
	const sumOfSquares = values.reduce((acc, value) => acc + value * value, 0);

	return {
		minWeight: Math.min(...values),
		maxWeight: Math.max(...values),
		// Kish : (somme des poids)^2 / somme des carres.
		effectiveSampleSize: sumOfSquares > 0 ? (sum * sum) / sumOfSquares : 0
	};
}
