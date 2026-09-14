import { z } from 'zod';
import {
	isBlank,
	nonResponseModality,
	nonResponseValue,
	type ModalityDescriptor,
	type NormalizeResult,
	type QuestionType
} from './types';

const configSchema = z
	.object({
		maxLength: z.number().int().positive().max(5000).default(2000)
	})
	.loose();

/**
 * Reponse en texte libre.
 *
 * Volontairement non croisable : autant de modalites que de repondants, donc des
 * effectifs de 1 partout, et surtout un risque de reidentification par le contenu
 * (« je suis le boulanger du village »). Le verbatim se lit, il ne se compte pas.
 */
export const freeText: QuestionType = {
	key: 'free_text',
	label: 'Texte libre',
	description: 'Un verbatim. Conservé et exporté, mais jamais proposé au croisement.',
	usesOptions: false,
	multiValued: false,
	crossable: false,

	parseConfig(raw) {
		const parsed = configSchema.safeParse(raw ?? {});
		if (!parsed.success) return { ok: false, reason: 'Configuration invalide.' };
		return { ok: true, config: parsed.data };
	},

	normalize(raw, context): NormalizeResult {
		if (isBlank(raw)) return { ok: true, values: [nonResponseValue()] };

		const text = String(raw).trim();
		const maxLength =
			typeof context.config.maxLength === 'number' ? context.config.maxLength : 2000;

		if (text.length > maxLength) {
			return {
				ok: false,
				reason: `Verbatim trop long : ${text.length} caractères (maximum ${maxLength}).`
			};
		}

		return {
			ok: true,
			values: [
				{
					// Toutes les reponses partagent une modalite unique : le texte libre se
					// compte « repondu / sans reponse », jamais par contenu.
					modalityKey: 'answered',
					optionCode: null,
					valueNumber: null,
					valueText: text
				}
			]
		};
	},

	modalities(context): readonly ModalityDescriptor[] {
		return [
			{ key: 'answered', label: 'A répondu', isNonResponse: false },
			nonResponseModality(context.options)
		];
	}
};
