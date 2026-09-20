import { requireFieldType } from './fields';
import type { OpenformsField, OpenformsForm } from './types';

/**
 * Un questionnaire distant peut-il etre servi sur `humanitour.fr` ?
 *
 * Trois reponses possibles, et la nuance entre les deux dernieres compte.
 *
 *   - SERVABLE — tous ses champs sont connus et collectables ici.
 *   - SERVABLE AVEC RETRAITS — il porte des champs identifiants FACULTATIFS.
 *     Ils ne sont ni affiches ni envoyes, et la fiche de liaison du back-office
 *     les nomme un par un. Un champ retire en silence serait exactement le
 *     « rejet masque » que l'ancien import s'interdisait deja.
 *   - REFUSE — il porte un champ identifiant OBLIGATOIRE, ou un type inconnu.
 *     Le remplir ici produirait une soumission qu'Openforms refuserait, ou pire,
 *     accepterait avec un courriel dedans. On ne sert pas le formulaire du tout ;
 *     la page publique renvoie vers `forms.humanitour.fr`, qui sait le rendre.
 */

export interface RemovedField {
	readonly key: string;
	readonly label: string;
	readonly type: string;
	readonly reason: string;
}

export interface UsabilityReport {
	/** Vrai si le questionnaire peut etre rempli sur `humanitour.fr`. */
	readonly servable: boolean;
	/** Champs affiches et collectes, dans l'ordre du questionnaire. */
	readonly fields: readonly OpenformsField[];
	/** Champs facultatifs ecartes, avec leur motif. */
	readonly removed: readonly RemovedField[];
	/** Motifs de refus. Vide si `servable`. */
	readonly blockers: readonly RemovedField[];
}

function describe(field: OpenformsField, reason: string): RemovedField {
	return { key: field.key, label: field.label, type: field.type, reason };
}

/**
 * Classe un champ : garde, retire, ou bloque.
 *
 * Les trois issues sont rendues par la meme fonction pour qu'aucune ne puisse
 * etre oubliee en ajoutant un cas.
 */
function classify(field: OpenformsField): { keep?: OpenformsField; removed?: RemovedField; blocker?: RemovedField } {
	let type;
	try {
		type = requireFieldType(field.type);
	} catch {
		return {
			blocker: describe(
				field,
				`type de champ inconnu de ce site : il ne peut être ni affiché ni validé correctement`
			)
		};
	}

	if (type.identifying) {
		const reason = `donnée directement identifiante (${type.label.toLowerCase()}), interdite par le RGPD sur ce site`;
		return field.required
			? { blocker: describe(field, `${reason} — et ce champ est obligatoire`) }
			: { removed: describe(field, reason) };
	}

	if (!type.carriesAnswer && field.type === 'stripe_payment') {
		return { removed: describe(field, "module de démonstration, sans transaction réelle") };
	}

	return { keep: field };
}

export function inspectForm(form: OpenformsForm): UsabilityReport {
	const fields: OpenformsField[] = [];
	const removed: RemovedField[] = [];
	const blockers: RemovedField[] = [];

	for (const field of form.fields) {
		const verdict = classify(field);
		if (verdict.keep) fields.push(verdict.keep);
		if (verdict.removed) removed.push(verdict.removed);
		if (verdict.blocker) blockers.push(verdict.blocker);
	}

	return { servable: blockers.length === 0, fields, removed, blockers };
}
