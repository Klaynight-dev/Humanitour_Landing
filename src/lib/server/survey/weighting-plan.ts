import { z } from 'zod';
import { getQuestionType, NON_RESPONSE_KEY, type ModalityDescriptor } from '$lib/shared/questions';
import {
	normalizeTargets,
	type WeightingDiagnostics,
	type WeightingUnit,
	type WeightingVariable
} from './weighting';

/**
 * Preparation d un redressement : ce qui separe la saisie d un analyste du
 * calage lui-meme (`weighting.ts`).
 *
 * Sans acces a la base, pour la meme raison que `explore.ts` : ce qui decide
 * d un chiffre publie doit se tester sans serveur.
 */

/** Une variable de calage telle qu elle est ecrite dans `SurveyWeighting.variables`. */
export interface StoredVariable {
	readonly questionCode: string;
	/** Parts cibles entre 0 et 1, de somme 1, par cle de modalite. */
	readonly targets: Readonly<Record<string, number>>;
}

const variablesSchema = z.array(
	z.object({
		questionCode: z.string().min(1),
		targets: z.record(z.string(), z.number())
	})
);

/** Lit la colonne JSON. Une valeur illisible vaut « aucune variable », jamais une exception. */
export function readVariables(raw: unknown): StoredVariable[] {
	const parsed = variablesSchema.safeParse(raw);
	return parsed.success ? parsed.data : [];
}

const diagnosticsSchema = z.object({
	iterations: z.number(),
	converged: z.boolean(),
	maxDeviation: z.number(),
	minWeight: z.number(),
	maxWeight: z.number(),
	effectiveSampleSize: z.number(),
	respondents: z.number(),
	warnings: z.array(
		z.object({ questionCode: z.string(), modalityKey: z.string(), reason: z.string() })
	)
});

export function readDiagnostics(raw: unknown): WeightingDiagnostics | null {
	const parsed = diagnosticsSchema.safeParse(raw);
	return parsed.success ? parsed.data : null;
}

/**
 * Une question peut-elle porter un calage ?
 *
 * Il faut UNE modalite par repondant : le calage range chaque personne dans une
 * case de la marge. Une question a choix multiple mettrait la meme personne
 * dans trois cases, et sa marge n a pas d equivalent dans une source de
 * population. Le texte libre, lui, n a pas de modalites enumerables.
 */
export function canCalibrateOn(type: string): boolean {
	const definition = getQuestionType(type);
	return !!definition && definition.crossable && !definition.multiValued;
}

/** Les modalites qui recoivent une cible : tout sauf la non-reponse. */
export function targetModalities(
	modalities: readonly ModalityDescriptor[]
): readonly ModalityDescriptor[] {
	return modalities.filter((modality) => !modality.isNonResponse);
}

export function toWeightingVariables(stored: readonly StoredVariable[]): WeightingVariable[] {
	return stored
		.map((variable) => ({
			questionCode: variable.questionCode,
			targets: normalizeTargets(new Map(Object.entries(variable.targets)))
		}))
		.filter((variable) => variable.targets.size > 0);
}

export interface CalibrationAnswer {
	readonly responseId: string;
	readonly questionCode: string;
	readonly modalityKey: string;
}

/**
 * Les repondants, reduits a leur modalite sur chaque variable de calage.
 *
 * La non-reponse n est PAS une modalite de calage : aucune source de population
 * ne dit combien de Francais « ne disent pas leur age ». Le repondant qui n a
 * pas repondu garde donc son poids sur cette variable, au lieu d etre range
 * dans une case qu aucune cible ne peut atteindre.
 */
export function buildUnits(
	responseIds: readonly string[],
	answers: readonly CalibrationAnswer[]
): WeightingUnit[] {
	const byResponse = new Map<string, Map<string, string>>(
		responseIds.map((id) => [id, new Map<string, string>()])
	);

	for (const answer of answers) {
		if (answer.modalityKey === NON_RESPONSE_KEY) continue;
		const modalities = byResponse.get(answer.responseId);
		if (!modalities || modalities.has(answer.questionCode)) continue;
		modalities.set(answer.questionCode, answer.modalityKey);
	}

	return [...byResponse].map(([id, modalities]) => ({ id, modalities }));
}

export interface CalibrationQuestion {
	readonly code: string;
	readonly label: string;
	readonly modalities: readonly ModalityDescriptor[];
}

/**
 * Tolerance sur la somme des parts saisies.
 *
 * Des pourcentages recopies et arrondis font 99,8 % : on normalise. Mais 87 %
 * n est pas un arrondi, c est une ligne oubliee, et normaliser en silence
 * gonflerait toutes les autres cibles d un septieme.
 */
const SUM_TOLERANCE = 0.02;

export type ParsedTargets =
	| { readonly ok: true; readonly variables: StoredVariable[] }
	| { readonly ok: false; readonly message: string };

/** « 12,5 » ou « 12.5 » ou « 12,5 % ». Vide = pas de cible. */
function readPercent(raw: FormDataEntryValue | null): number | null {
	if (typeof raw !== 'string') return null;
	const cleaned = raw.replace('%', '').replace(',', '.').trim();
	if (cleaned === '') return null;
	const value = Number(cleaned);
	return Number.isFinite(value) ? value : Number.NaN;
}

export function targetField(questionCode: string, modalityKey: string): string {
	return `cible:${questionCode}:${modalityKey}`;
}

/**
 * Lit les marges saisies dans le formulaire du back-office.
 *
 * Les champs sont `variable` (une valeur par question retenue) et
 * `cible:<code>:<modalite>` en pourcentage. Les parts sont ecrites
 * normalisees : ce qui est en base est exactement ce qui sert au calcul.
 */
export function parseTargetsForm(
	form: FormData,
	candidates: readonly CalibrationQuestion[]
): ParsedTargets {
	const selected = new Set(form.getAll('variable').map(String));
	const variables: StoredVariable[] = [];

	for (const question of candidates) {
		if (!selected.has(question.code)) continue;

		const parsed = readQuestionTargets(form, question);
		if (!parsed.ok) return parsed;
		variables.push(parsed.variable);
	}

	if (variables.length === 0) {
		return { ok: false, message: 'Retenez au moins une variable de calage.' };
	}

	return { ok: true, variables };
}

function readQuestionTargets(
	form: FormData,
	question: CalibrationQuestion
): { ok: true; variable: StoredVariable } | { ok: false; message: string } {
	const raw = new Map<string, number>();

	for (const modality of targetModalities(question.modalities)) {
		const value = readPercent(form.get(targetField(question.code, modality.key)));
		if (value === null) continue;
		if (Number.isNaN(value) || value < 0 || value > 100) {
			return {
				ok: false,
				message: `« ${question.label} », modalité « ${modality.label} » : saisissez un pourcentage entre 0 et 100.`
			};
		}
		raw.set(modality.key, value / 100);
	}

	const sum = [...raw.values()].reduce((acc, share) => acc + share, 0);
	if (Math.abs(sum - 1) > SUM_TOLERANCE) {
		const percent = (sum * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
		return {
			ok: false,
			message: `Les cibles de « ${question.label} » totalisent ${percent} % au lieu de 100 % : une modalité a sans doute été oubliée.`
		};
	}

	return {
		ok: true,
		variable: {
			questionCode: question.code,
			targets: Object.fromEntries(normalizeTargets(raw))
		}
	};
}

/**
 * Le redressement tel qu on le publie : tout ce qui a servi a le faire, en
 * libelles lisibles. Page et API en donnent exactement la meme description.
 */
export function describeWeighting(
	weighting: {
		readonly version: number;
		readonly computedAt: Date;
		readonly source: string | null;
		readonly variables: readonly StoredVariable[];
		readonly diagnostics: WeightingDiagnostics | null;
	},
	questions: readonly CalibrationQuestion[]
) {
	const diagnostics = weighting.diagnostics;

	return {
		version: weighting.version,
		computedAt: weighting.computedAt,
		source: weighting.source,
		variables: weighting.variables.map((variable) => {
			const question = questions.find((candidate) => candidate.code === variable.questionCode);
			return {
				code: variable.questionCode,
				label: question?.label ?? variable.questionCode,
				targets: Object.entries(variable.targets).map(([key, share]) => ({
					key,
					label: question?.modalities.find((modality) => modality.key === key)?.label ?? key,
					share
				}))
			};
		}),
		diagnostics: diagnostics && {
			converged: diagnostics.converged,
			maxDeviation: diagnostics.maxDeviation,
			minWeight: diagnostics.minWeight,
			maxWeight: diagnostics.maxWeight,
			effectiveSampleSize: diagnostics.effectiveSampleSize,
			respondents: diagnostics.respondents
		}
	};
}

export type WeightingDescription = ReturnType<typeof describeWeighting>;

/** Une ligne du rapport de calage : ce qu on avait, ce qu on visait, ce qu on a obtenu. */
export interface MarginRow {
	readonly key: string;
	readonly label: string;
	readonly observed: number | null;
	readonly target: number | null;
	readonly weighted: number | null;
}

/**
 * Marges observee, cible et obtenue, pour une variable.
 *
 * C est l ecran que l analyste lit avant de publier : si une modalite reste a
 * trois points de sa cible, il le voit ici, chiffre par chiffre, et non dans un
 * seul indicateur d ecart maximal.
 */
export function marginReport(
	units: readonly WeightingUnit[],
	weights: ReadonlyMap<string, number> | null,
	questionCode: string,
	modalities: readonly ModalityDescriptor[],
	targets: Readonly<Record<string, number>> | null
): { rows: MarginRow[]; unknown: number } {
	const raw = new Map<string, number>();
	const weighted = new Map<string, number>();
	let rawTotal = 0;
	let weightedTotal = 0;
	let unknown = 0;

	for (const unit of units) {
		const key = unit.modalities.get(questionCode);
		if (key === undefined) {
			unknown += 1;
			continue;
		}
		const weight = weights?.get(unit.id) ?? 1;
		raw.set(key, (raw.get(key) ?? 0) + 1);
		weighted.set(key, (weighted.get(key) ?? 0) + weight);
		rawTotal += 1;
		weightedTotal += weight;
	}

	const rows = targetModalities(modalities).map((modality) => ({
		key: modality.key,
		label: modality.label,
		observed: rawTotal > 0 ? (raw.get(modality.key) ?? 0) / rawTotal : null,
		target: targets?.[modality.key] ?? null,
		weighted:
			weights && weightedTotal > 0 ? (weighted.get(modality.key) ?? 0) / weightedTotal : null
	}));

	return { rows, unknown };
}
