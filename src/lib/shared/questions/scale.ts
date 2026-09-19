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
		min: z.number().int().default(1),
		max: z.number().int().default(10),
		minLabel: z.string().optional(),
		maxLabel: z.string().optional()
	})
	.loose()
	.refine((config) => config.max > config.min, {
		message: 'La borne haute doit être supérieure à la borne basse.'
	});

function bounds(context: QuestionContext): { min: number; max: number } {
	const min = typeof context.config.min === 'number' ? context.config.min : 1;
	const max = typeof context.config.max === 'number' ? context.config.max : 10;
	return { min, max };
}

export const scale: QuestionType = {
	key: 'scale',
	label: 'Échelle',
	description: 'Une note entière entre deux bornes, par exemple de 1 à 10.',
	usesOptions: false,
	multiValued: false,
	ordered: true,
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
		if (!Number.isInteger(value)) return { ok: false, reason: 'Valeur attendue : un entier.' };

		const { min, max } = bounds(context);
		if (value < min || value > max) {
			return { ok: false, reason: `Note hors bornes : ${value} (attendu entre ${min} et ${max}).` };
		}

		return {
			ok: true,
			values: [
				{
					modalityKey: String(value),
					optionCode: null,
					valueNumber: value,
					valueText: null
				}
			]
		};
	},

	modalities(context): readonly ModalityDescriptor[] {
		const { min, max } = bounds(context);
		const minLabel = typeof context.config.minLabel === 'string' ? context.config.minLabel : null;
		const maxLabel = typeof context.config.maxLabel === 'string' ? context.config.maxLabel : null;

		const steps: ModalityDescriptor[] = [];
		for (let value = min; value <= max; value += 1) {
			const suffix = labelSuffix(value, min, max, minLabel, maxLabel);
			steps.push({ key: String(value), label: `${value}${suffix}`, isNonResponse: false });
		}

		return [...steps, nonResponseModality(context.options)];
	}
};

/** Les bornes portent un libelle (« 1 (pas du tout) »), les pas intermediaires non. */
function labelSuffix(
	value: number,
	min: number,
	max: number,
	minLabel: string | null,
	maxLabel: string | null
): string {
	if (value === min && minLabel) return ` (${minLabel})`;
	if (value === max && maxLabel) return ` (${maxLabel})`;
	return '';
}
