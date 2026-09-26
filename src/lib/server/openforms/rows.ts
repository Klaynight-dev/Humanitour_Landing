import { requireFieldType } from '$lib/shared/openforms/fields';
import type { OpenformsField } from '$lib/shared/openforms/types';
import type { RowSet } from '$lib/server/normalize/identifying';
import type { RemoteSubmission } from './api';

/**
 * Mise a plat des soumissions distantes en tableau normalisable.
 *
 * Extrait de `sync.ts`, qui orchestre la base et le reseau : c'est ici que se
 * trouve la seule regle de la synchronisation qui merite d'etre verifiee ligne
 * a ligne, puisqu'une erreur ici corromprait le jeu de donnees publie.
 *
 * L'aplatissement est delegue au registre des types de champ : c'est lui qui
 * sait qu'un choix multiple se rend en liste separee par des points-virgules et
 * qu'une grille se rend en « ligne = reponse ».
 */

/**
 * Un champ dont le type est inconnu du registre est IGNORE, pas fatal.
 *
 * La liaison du formulaire l'a deja signale a l'equipe, et perdre une colonne
 * vaut mieux que perdre toutes les reponses d'une soiree de collecte parce
 * qu'Openforms a gagne un type de champ entre deux versions.
 */
function readable(fields: readonly OpenformsField[]) {
	return fields.flatMap((field) => {
		try {
			const type = requireFieldType(field.type);
			return type.carriesAnswer ? [{ key: field.key, type }] : [];
		} catch {
			return [];
		}
	});
}

export function toRowSet(
	fields: readonly OpenformsField[],
	submissions: readonly RemoteSubmission[]
): RowSet {
	const columns = readable(fields);

	return {
		columns: columns.map((column) => column.key),
		rows: submissions.map((submission) =>
			Object.fromEntries(
				columns.map((column) => [column.key, column.type.toCell(submission.values[column.key])])
			)
		)
	};
}

/**
 * Valeurs saisies dans un champ de type courriel, telles que soumises.
 *
 * Le type « email » a `carriesAnswer: false` (AGENTS.md section 4) : il n
 * entre donc jamais dans `toRowSet`, ni dans une reponse. Cette fonction lit
 * la meme source pour un usage different, l inscription a l infolettre — sur
 * `NewsletterSubscriber`, jamais reliee a la soumission dont l adresse vient.
 */
export function extractNewsletterEmails(
	fields: readonly OpenformsField[],
	submissions: readonly RemoteSubmission[]
): readonly string[] {
	const keys = fields.filter((field) => field.type === 'email').map((field) => field.key);
	if (keys.length === 0) return [];

	return submissions.flatMap((submission) =>
		keys.flatMap((key) => {
			const value = submission.values[key];
			return typeof value === 'string' && value.trim() !== '' ? [value] : [];
		})
	);
}
