import {
	readGridRows,
	type FieldTypeDefinition,
	type FieldValue,
	type OpenformsField
} from '../types';

/**
 * Grilles d'evaluation : une question par ligne, les memes colonnes pour toutes.
 *
 * La saisie est un enregistrement indexe par libelle de ligne. La grille simple
 * n'accepte qu'une colonne par ligne, la grille a cases en accepte plusieurs,
 * separees par des points-virgules dans la valeur stockee.
 *
 * `questionType` vaut `null` : une grille porte plusieurs reponses sous une
 * seule cle, elle n'a donc pas d'equivalent parmi les types de question, qui
 * portent chacun une variable. Elle se remplit et se soumet, elle n'entre pas
 * dans les croisements.
 */
function gridLike(key: string, label: string, multiple: boolean): FieldTypeDefinition {
	return {
		key,
		label,
		carriesAnswer: true,
		identifying: false,
		questionType: null,

		blank: (field: OpenformsField) =>
			Object.fromEntries((field.grid?.rows ?? []).map((row) => [row, ''])),

		validate(field: OpenformsField, value: FieldValue): string | null {
			if (!field.required) return null;

			const rows = field.grid?.rows ?? [];
			const answers = value as Record<string, string>;
			const missing = rows.find((row) => (answers[row] ?? '').trim() === '');

			return missing === undefined ? null : `Ligne « ${missing} » : aucune réponse.`;
		},

		toSubmission(field: OpenformsField, value: FieldValue): unknown {
			const rows = field.grid?.rows ?? [];
			const answers = value as Record<string, string>;

			return Object.fromEntries(
				rows
					.filter((row) => (answers[row] ?? '').trim() !== '')
					.map((row) => [row, multiple ? answers[row]!.split(';').map((c) => c.trim()) : answers[row]])
			);
		},

		readForm: (field: OpenformsField, form: FormData) => readGridRows(field, form, multiple),

		toCell(value: unknown): unknown {
			if (!value || typeof value !== 'object') return value;

			// Une grille rendue en cellule ne sert qu'a l'export brut : une ligne
			// « intitule = reponse » par ligne de grille reste lisible, la ou du
			// JSON ne l'est pas dans un tableur.
			return Object.entries(value as Record<string, unknown>)
				.map(([row, answer]) => `${row} = ${Array.isArray(answer) ? answer.join(', ') : String(answer)}`)
				.join(' ; ');
		}
	};
}

export const grid = gridLike('grid', "Grille d'évaluation", false);
export const checkboxGrid = gridLike('checkbox_grid', 'Grille à cases', true);
