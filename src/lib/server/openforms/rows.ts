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
