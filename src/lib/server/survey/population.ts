import type { FilterClause } from '$shared/explore';

/**
 * Sous-population etudiee.
 *
 * Filtrer, c est repondre a « et si on ne regardait que les Bretons de 18 a 24
 * ans ? ». L agregation, elle, ne change pas d un iota : elle recoit moins de
 * lignes, un point. Aucune fonction de `aggregate.ts` n a de branche « filtre »,
 * et c est voulu (AGENTS.md section 1.2) : un filtre qui se brancherait dans le
 * calcul finirait par diverger du calcul non filtre.
 *
 * DANGER RGPD, et c est la raison d etre de ce fichier : un filtre est une
 * machine a decouper l echantillon. « Bretagne + 18-24 ans + cadre » peut ne
 * designer qu une personne. Le seuil de k-anonymat ne s applique donc pas
 * seulement aux cases du tableau, mais a la POPULATION elle-meme : sous le
 * seuil, on ne publie rien, pas meme son effectif.
 */

/** Clause resolue : la question existe, elle est filtrable, ses cles sont retenues. */
export interface AppliedClause {
	readonly questionCode: string;
	readonly questionId: string;
	readonly questionLabel: string;
	readonly modalityKeys: readonly string[];
}

/**
 * Clause qu on n a pas su appliquer, avec sa raison.
 *
 * On ne l ignore JAMAIS en silence : un lien « seulement la Bretagne » dont le
 * filtre tombe afficherait toute la France sous le meme titre. Mieux vaut un
 * avertissement visible qu un chiffre juste repondant a la mauvaise question.
 */
export interface DroppedClause {
	readonly questionCode: string;
	readonly reason: string;
}

export interface ClauseResolution {
	readonly applied: readonly AppliedClause[];
	readonly dropped: readonly DroppedClause[];
}

/** Ce qu une question doit exposer pour servir de filtre. */
export interface FilterableQuestion {
	readonly id: string;
	readonly code: string;
	readonly label: string;
}

/**
 * Apparie les clauses d URL aux questions de l enquete.
 *
 * Seules les questions croisables filtrent : une question en texte libre a
 * autant de modalites que de repondants, filtrer dessus reviendrait a designer
 * quelqu un.
 */
export function matchClauses(
	filterable: readonly FilterableQuestion[],
	filters: readonly FilterClause[]
): ClauseResolution {
	const byCode = new Map(filterable.map((question) => [question.code, question]));
	const applied: AppliedClause[] = [];
	const dropped: DroppedClause[] = [];

	for (const clause of filters) {
		const question = byCode.get(clause.questionCode);
		if (!question) {
			dropped.push({
				questionCode: clause.questionCode,
				reason: "cette question n'existe plus, ou ne peut pas servir de filtre"
			});
			continue;
		}

		applied.push({
			questionCode: question.code,
			questionId: question.id,
			questionLabel: question.label,
			modalityKeys: clause.modalityKeys
		});
	}

	return { applied, dropped };
}

export interface Population {
	/** Le repondant entre-t-il dans la population etudiee ? */
	includes(responseId: string): boolean;
	/** Repondants retenus. */
	readonly size: number;
	/** Repondants de l enquete entiere, pour lire la restriction. */
	readonly total: number;
	/** Vrai des qu au moins un filtre s applique. */
	readonly restricted: boolean;
}

/**
 * Toute l enquete.
 *
 * Ce n est pas le « cas sans filtre » branche a part : c est une population
 * comme une autre, qui accepte tout le monde. Les appelants n ont donc aucun
 * test de nullite a ecrire.
 */
export function everyone(total: number): Population {
	return { includes: () => true, size: total, total, restricted: false };
}

/**
 * Intersection des repondants de chaque clause.
 *
 * Deux clauses se lisent en ET : c est ce croisement qui restreint. Le OU entre
 * modalites d une meme question est deja fait en amont, par la requete qui
 * ramene les repondants de la clause.
 */
export function restrictTo(total: number, clauseSets: readonly ReadonlySet<string>[]): Population {
	const retained = intersect(clauseSets);

	return {
		includes: (responseId) => retained.has(responseId),
		size: retained.size,
		total,
		restricted: true
	};
}

function intersect(sets: readonly ReadonlySet<string>[]): ReadonlySet<string> {
	// On part du plus petit ensemble : l intersection ne peut pas etre plus
	// grande que lui, et le parcours est d autant plus court.
	const ordered = [...sets].sort((a, b) => a.size - b.size);
	const smallest = ordered[0];
	if (!smallest) return new Set();

	const others = ordered.slice(1);

	return new Set([...smallest].filter((id) => others.every((set) => set.has(id))));
}

/**
 * La population est-elle trop petite pour qu on en publie quoi que ce soit ?
 *
 * Publier « base : 3 repondants » est deja une divulgation : c est un agregat
 * portant sur moins de `k` personnes, exactement ce que l article 9 du RGPD
 * nous interdit de sortir (AGENTS.md section 4). On s arrete donc AVANT de
 * calculer, pas apres.
 */
export function isTooSmall(population: Population, threshold: number): boolean {
	return population.size < threshold;
}

/** Reduit des lignes de reponses a la population etudiee. */
export function within<Row extends { readonly responseId: string }>(
	rows: readonly Row[],
	population: Population
): readonly Row[] {
	return rows.filter((row) => population.includes(row.responseId));
}
