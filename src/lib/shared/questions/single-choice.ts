import { z } from 'zod';
import {
	declaredModalities,
	isBlank,
	nonResponseModality,
	nonResponseValue,
	type ModalityDescriptor,
	type NormalizeResult,
	type QuestionContext,
	type QuestionType
} from './types';

const configSchema = z.object({}).loose();

/**
 * Trouve l option correspondant a une valeur brute.
 *
 * Un fichier importe contient le code (`priorite_pouvoir_achat`) ou le libelle
 * (`Le pouvoir d achat`) selon l outil qui l a produit. On accepte les deux, en
 * comparaison insensible a la casse et aux espaces de bord, parce qu exiger un
 * format unique ferait rejeter des jeux de donnees parfaitement valides.
 */
function matchOption(raw: string, context: QuestionContext) {
	const needle = raw.trim().toLowerCase();

	return context.options.find(
		(option) =>
			option.code.toLowerCase() === needle || option.label.trim().toLowerCase() === needle
	);
}

export const singleChoice: QuestionType = {
	key: 'single_choice',
	label: 'Choix unique',
	description: 'Une seule reponse parmi une liste de modalites declarees.',
	usesOptions: true,
	multiValued: false,
	crossable: true,

	parseConfig(raw) {
		const parsed = configSchema.safeParse(raw ?? {});
		if (!parsed.success) return { ok: false, reason: 'Configuration invalide.' };
		return { ok: true, config: parsed.data };
	},

	normalize(raw, context): NormalizeResult {
		if (isBlank(raw)) return { ok: true, values: [nonResponseValue()] };

		if (typeof raw !== 'string' && typeof raw !== 'number') {
			return { ok: false, reason: 'Valeur attendue : texte ou nombre.' };
		}

		const option = matchOption(String(raw), context);
		if (!option) {
			return { ok: false, reason: `Modalite inconnue : « ${String(raw).trim()} ».` };
		}

		// Une option explicitement marquee « sans opinion » rejoint la non-reponse :
		// une seule cle pour un seul concept, sinon les deux se comptent separement.
		if (option.isNonResponse) return { ok: true, values: [nonResponseValue()] };

		return {
			ok: true,
			values: [
				{
					modalityKey: option.code,
					optionCode: option.code,
					valueNumber: null,
					valueText: null
				}
			]
		};
	},

	modalities(context): readonly ModalityDescriptor[] {
		return [...declaredModalities(context.options), nonResponseModality(context.options)];
	}
};
