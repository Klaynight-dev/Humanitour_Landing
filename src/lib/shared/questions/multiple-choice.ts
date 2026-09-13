import { z } from 'zod';
import {
	declaredModalities,
	isBlank,
	nonResponseModality,
	nonResponseValue,
	type ModalityDescriptor,
	type NormalizedValue,
	type NormalizeResult,
	type QuestionContext,
	type QuestionType
} from './types';

const configSchema = z
	.object({
		/** Separateur utilise quand les reponses arrivent dans une seule cellule. */
		separator: z.string().min(1).max(3).default(';'),
		maxChoices: z.number().int().positive().optional()
	})
	.loose();

/** Decoupe une cellule en valeurs, qu elle contienne deja un tableau ou une liste. */
function splitRaw(raw: unknown, separator: string): string[] {
	if (Array.isArray(raw)) return raw.map((item) => String(item));
	return String(raw)
		.split(separator)
		.map((part) => part.trim())
		.filter((part) => part !== '');
}

function matchOption(value: string, context: QuestionContext) {
	const needle = value.trim().toLowerCase();
	return context.options.find(
		(option) => option.code.toLowerCase() === needle || option.label.trim().toLowerCase() === needle
	);
}

export const multipleChoice: QuestionType = {
	key: 'multiple_choice',
	label: 'Choix multiple',
	description: 'Plusieurs reponses possibles parmi une liste de modalites declarees.',
	usesOptions: true,
	multiValued: true,
	crossable: true,

	parseConfig(raw) {
		const parsed = configSchema.safeParse(raw ?? {});
		if (!parsed.success) return { ok: false, reason: 'Configuration invalide.' };
		return { ok: true, config: parsed.data };
	},

	normalize(raw, context): NormalizeResult {
		if (isBlank(raw)) return { ok: true, values: [nonResponseValue()] };

		const separator = typeof context.config.separator === 'string' ? context.config.separator : ';';
		const parts = splitRaw(raw, separator);
		if (parts.length === 0) return { ok: true, values: [nonResponseValue()] };

		const values: NormalizedValue[] = [];
		const seen = new Set<string>();

		for (const part of parts) {
			const option = matchOption(part, context);
			if (!option) return { ok: false, reason: `Modalite inconnue : « ${part} ».` };
			// Une modalite citee deux fois dans la meme cellule ne compte qu une fois,
			// sans quoi ce repondant pesera double dans sa propre part.
			if (option.isNonResponse || seen.has(option.code)) continue;

			seen.add(option.code);
			values.push({
				modalityKey: option.code,
				optionCode: option.code,
				valueNumber: null,
				valueText: null
			});
		}

		// Ne cocher que « sans opinion » est une non-reponse, pas une reponse vide.
		if (values.length === 0) return { ok: true, values: [nonResponseValue()] };

		const max = context.config.maxChoices;
		if (typeof max === 'number' && values.length > max) {
			return { ok: false, reason: `Au plus ${max} reponses attendues, ${values.length} trouvees.` };
		}

		return { ok: true, values };
	},

	modalities(context): readonly ModalityDescriptor[] {
		return [...declaredModalities(context.options), nonResponseModality(context.options)];
	}
};
