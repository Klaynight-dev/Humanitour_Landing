import { z } from 'zod';
import {
	isBlank,
	nonResponseModality,
	nonResponseValue,
	type ModalityDescriptor,
	type NormalizeResult,
	type QuestionContext,
	type QuestionType
} from './types';

const configSchema = z
	.object({
		unit: z.string().max(16).optional(),
		min: z.number().optional(),
		max: z.number().optional(),
		/**
		 * Largeur des tranches de regroupement. Sans elle, chaque valeur distincte
		 * devient sa propre modalite : croiser l age au nombre d annees produirait
		 * des effectifs de 1 ou 2, tous masques par le seuil d anonymat. C est donc
		 * la tranche, et non la valeur exacte, qui rend un nombre reellement
		 * croisable.
		 */
		bucketSize: z.number().positive().optional(),
		bucketStart: z.number().optional()
	})
	.loose()
	.refine(
		(config) => config.min === undefined || config.max === undefined || config.max > config.min,
		{
			message: 'La borne haute doit etre superieure a la borne basse.'
		}
	);

interface Bucketing {
	readonly size: number;
	readonly start: number;
}

function bucketing(context: QuestionContext): Bucketing | null {
	const { bucketSize, bucketStart, min } = context.config;
	if (typeof bucketSize !== 'number' || bucketSize <= 0) return null;

	const start = typeof bucketStart === 'number' ? bucketStart : typeof min === 'number' ? min : 0;

	return { size: bucketSize, start };
}

/** Cle de tranche, stable dans le temps : elle voyage dans les permaliens. */
export function bucketKey(value: number, { size, start }: Bucketing): string {
	const index = Math.floor((value - start) / size);
	const low = start + index * size;
	if (size === 1) return String(low);
	return `${low}-${low + size - 1}`;
}

export const numberQuestion: QuestionType = {
	key: 'number',
	label: 'Nombre',
	description: 'Une valeur numerique, regroupee en tranches pour les croisements.',
	usesOptions: false,
	multiValued: false,
	crossable: true,

	parseConfig(raw) {
		const parsed = configSchema.safeParse(raw ?? {});
		if (!parsed.success) {
			return { ok: false, reason: parsed.error.issues[0]?.message ?? 'Configuration invalide.' };
		}
		return { ok: true, config: parsed.data };
	},

	normalize(raw, context): NormalizeResult {
		if (isBlank(raw)) return { ok: true, values: [nonResponseValue()] };

		const value = typeof raw === 'number' ? raw : Number(String(raw).trim().replace(',', '.'));
		if (!Number.isFinite(value)) return { ok: false, reason: 'Valeur attendue : un nombre.' };

		const { min, max } = context.config;
		if (typeof min === 'number' && value < min) {
			return { ok: false, reason: `Valeur sous la borne basse : ${value} < ${min}.` };
		}
		if (typeof max === 'number' && value > max) {
			return { ok: false, reason: `Valeur au-dessus de la borne haute : ${value} > ${max}.` };
		}

		const buckets = bucketing(context);

		return {
			ok: true,
			values: [
				{
					modalityKey: buckets ? bucketKey(value, buckets) : String(value),
					optionCode: null,
					// La valeur exacte reste stockee : elle sert aux exports bruts et aux
					// moyennes, meme quand l affichage regroupe en tranches.
					valueNumber: value,
					valueText: null
				}
			]
		};
	},

	modalities(context): readonly ModalityDescriptor[] {
		const buckets = bucketing(context);
		const { min, max, unit } = context.config;

		// Sans tranches ni bornes, les modalites ne sont pas enumerables a l avance :
		// l agregation les decouvrira dans les donnees.
		if (!buckets || typeof min !== 'number' || typeof max !== 'number') {
			return [nonResponseModality(context.options)];
		}

		const suffix = typeof unit === 'string' && unit !== '' ? ` ${unit}` : '';
		const steps: ModalityDescriptor[] = [];

		for (let low = buckets.start; low <= max; low += buckets.size) {
			const key = bucketKey(low, buckets);
			steps.push({ key, label: `${key}${suffix}`, isNonResponse: false });
		}

		return [...steps, nonResponseModality(context.options)];
	}
};
