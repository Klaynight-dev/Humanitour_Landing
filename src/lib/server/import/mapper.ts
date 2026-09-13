import { requireQuestionType, type QuestionOptionLike } from '$lib/shared/questions';
import { toColumnKey } from '$lib/shared/slug';
import { detectIdentifyingColumns, type RowSet } from './types';

/**
 * Transformation d un tableau brut en reponses.
 *
 * Deux principes :
 *
 *   - Un import ne masque jamais un rejet. Chaque ligne refusee est rendue avec
 *     sa raison, son numero et la colonne fautive. L operateur decide ensuite.
 *   - Une ligne est acceptee ou rejetee en entier. Importer « la moitie d un
 *     questionnaire » produirait des croisements faux, puisque le repondant
 *     compterait dans une question et pas dans l autre.
 */

export interface ImportableQuestion {
	readonly code: string;
	readonly label: string;
	readonly type: string;
	readonly config: Readonly<Record<string, unknown>>;
	readonly options: readonly QuestionOptionLike[];
}

/** Correspondance code de question vers nom de colonne du fichier. */
export type ColumnMapping = Readonly<Record<string, string>>;

export interface MappedAnswer {
	readonly questionCode: string;
	readonly modalityKey: string;
	readonly optionCode: string | null;
	readonly valueNumber: number | null;
	readonly valueText: string | null;
}

export interface MappedRow {
	/** Numero de ligne dans le fichier, en-tete comprise : ce que voit l operateur. */
	readonly line: number;
	readonly answers: readonly MappedAnswer[];
}

export interface RejectedRow {
	readonly line: number;
	readonly questionCode: string;
	readonly column: string;
	readonly value: string;
	readonly reason: string;
}

export interface ImportReport {
	readonly accepted: readonly MappedRow[];
	readonly rejected: readonly RejectedRow[];
	readonly total: number;
}

export class IdentifyingDataError extends Error {
	constructor(readonly columns: readonly string[]) {
		super(
			`Le fichier contient des colonnes directement identifiantes : ${columns.join(', ')}. ` +
				"Retirez-les du fichier avant de l'importer."
		);
		this.name = 'IdentifyingDataError';
	}
}

/** Rend une valeur lisible dans un rapport d erreur, sans exploser sa longueur. */
function preview(value: unknown): string {
	if (value === null || value === undefined) return '';
	const text = String(value);
	return text.length > 60 ? `${text.slice(0, 57)}...` : text;
}

/**
 * Normalise une ligne.
 *
 * Retourne les reponses si toutes les colonnes mappees sont valides, sinon le
 * premier rejet rencontre. On s arrete au premier : signaler dix erreurs sur la
 * meme ligne mal formatee n aide pas, c est la ligne qui est a corriger.
 */
function mapRow(
	row: Readonly<Record<string, unknown>>,
	line: number,
	questions: readonly ImportableQuestion[],
	mapping: ColumnMapping
): MappedRow | RejectedRow {
	const answers: MappedAnswer[] = [];

	for (const question of questions) {
		const column = mapping[question.code];
		if (!column) continue;

		const type = requireQuestionType(question.type);
		const raw = row[column];
		const result = type.normalize(raw, { config: question.config, options: question.options });

		if (!result.ok) {
			return {
				line,
				questionCode: question.code,
				column,
				value: preview(raw),
				reason: result.reason
			};
		}

		answers.push(...result.values.map((value) => ({ questionCode: question.code, ...value })));
	}

	return { line, answers };
}

function isRejected(result: MappedRow | RejectedRow): result is RejectedRow {
	return 'reason' in result;
}

/**
 * Applique une correspondance de colonnes a un tableau brut.
 *
 * @throws {IdentifyingDataError} si le fichier porte une colonne directement
 * identifiante, qu elle soit mappee ou non : elle ne doit pas entrer, meme
 * inutilisee.
 */
export function mapRows(
	rowSet: RowSet,
	questions: readonly ImportableQuestion[],
	mapping: ColumnMapping
): ImportReport {
	const identifying = detectIdentifyingColumns(rowSet.columns);
	if (identifying.length > 0) throw new IdentifyingDataError(identifying);

	const accepted: MappedRow[] = [];
	const rejected: RejectedRow[] = [];

	rowSet.rows.forEach((row, index) => {
		// +2 : la ligne 1 est l en-tete, et les operateurs comptent a partir de 1.
		const result = mapRow(row, index + 2, questions, mapping);
		if (isRejected(result)) {
			rejected.push(result);
			return;
		}
		accepted.push(result);
	});

	return { accepted, rejected, total: rowSet.rows.length };
}

/**
 * Propose une correspondance automatique entre colonnes et questions.
 *
 * Compare au code puis au libelle, en ignorant casse, accents et ponctuation.
 * L operateur garde la main : c est une proposition, pas une decision.
 */
export function suggestMapping(
	rowSet: RowSet,
	questions: readonly ImportableQuestion[]
): ColumnMapping {
	const normalized = new Map(rowSet.columns.map((column) => [toColumnKey(column), column]));
	const mapping: Record<string, string> = {};

	for (const question of questions) {
		const match =
			normalized.get(toColumnKey(question.code)) ?? normalized.get(toColumnKey(question.label));
		if (match) mapping[question.code] = match;
	}

	return mapping;
}
