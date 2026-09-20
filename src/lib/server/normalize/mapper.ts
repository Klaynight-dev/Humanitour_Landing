import { requireQuestionType, type QuestionOptionLike } from '$lib/shared/questions';
import { toColumnKey } from '$lib/shared/slug';
import { detectIdentifyingColumns, type RowSet } from './identifying';

/**
 * Transformation d un tableau brut en reponses.
 *
 * Le tableau vient des soumissions Openforms : une ligne par repondant, une
 * colonne par cle de champ distante. La normalisation, elle, ne sait pas d ou
 * vient le tableau, et c est ce qui la rend testable sans reseau.
 *
 * Deux principes :
 *
 *   - Une synchronisation ne masque jamais un rejet. Chaque ligne refusee est
 *     rendue avec sa raison, son rang et la colonne fautive. L operateur decide
 *     ensuite.
 *   - Une ligne est acceptee ou rejetee en entier. Enregistrer « la moitie d un
 *     questionnaire » produirait des croisements faux, puisque le repondant
 *     compterait dans une question et pas dans l autre.
 */

export interface MappableQuestion {
	readonly code: string;
	readonly label: string;
	readonly type: string;
	readonly config: Readonly<Record<string, unknown>>;
	readonly options: readonly QuestionOptionLike[];
}

/** Correspondance code de question vers cle de champ Openforms. */
export type ColumnMapping = Readonly<Record<string, string>>;

export interface MappedAnswer {
	readonly questionCode: string;
	readonly modalityKey: string;
	readonly optionCode: string | null;
	readonly valueNumber: number | null;
	readonly valueText: string | null;
}

export interface MappedRow {
	/** Rang de la soumission dans le lot recu. Ce que le journal affiche. */
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

export interface MappingReport {
	readonly accepted: readonly MappedRow[];
	readonly rejected: readonly RejectedRow[];
	readonly total: number;
}

export class IdentifyingDataError extends Error {
	constructor(readonly columns: readonly string[]) {
		super(
			`Le formulaire porte des champs directement identifiants : ${columns.join(', ')}. ` +
				'Retirez-les du questionnaire chez Openforms avant de resynchroniser.'
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
	questions: readonly MappableQuestion[],
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
 * @throws {IdentifyingDataError} si le tableau porte une colonne directement
 * identifiante, qu elle soit mappee ou non : elle ne doit pas entrer, meme
 * inutilisee.
 */
export function mapRows(
	rowSet: RowSet,
	questions: readonly MappableQuestion[],
	mapping: ColumnMapping
): MappingReport {
	const identifying = detectIdentifyingColumns(rowSet.columns);
	if (identifying.length > 0) throw new IdentifyingDataError(identifying);

	const accepted: MappedRow[] = [];
	const rejected: RejectedRow[] = [];

	rowSet.rows.forEach((row, index) => {
		// Les operateurs comptent a partir de 1, pas de 0.
		const result = mapRow(row, index + 1, questions, mapping);
		if (isRejected(result)) {
			rejected.push(result);
			return;
		}
		accepted.push(result);
	});

	return { accepted, rejected, total: rowSet.rows.length };
}

/** Un champ distant, tel que la proposition de correspondance le compare. */
export interface MappableField {
	readonly key: string;
	readonly label: string;
}

/** Index des champs par texte normalise. Le premier declare l emporte. */
function indexBy(
	fields: readonly MappableField[],
	read: (field: MappableField) => string
): ReadonlyMap<string, string> {
	const index = new Map<string, string>();

	for (const field of fields) {
		const text = toColumnKey(read(field));
		if (text !== '' && !index.has(text)) index.set(text, field.key);
	}

	return index;
}

/**
 * Propose une correspondance automatique entre champs distants et questions.
 *
 * Compare au LIBELLE autant qu a la cle, en ignorant casse, accents et
 * ponctuation. La cle seule ne suffisait pas : le builder d Openforms engendre
 * des cles opaques (« champ_m3x9z1_4 »), donc aucune ne pouvait ressembler a un
 * code ni a un libelle de question, et la proposition restait toujours vide.
 * L operateur se retrouvait a etablir la correspondance entierement a la main,
 * ou a decouvrir a la premiere synchronisation qu aucune question n etait
 * reliee.
 *
 * Un champ n alimente qu une question : l enregistrement refuse les doublons,
 * une proposition qui en produit serait donc irrecevable telle quelle.
 */
export function suggestMapping(
	fields: readonly MappableField[],
	questions: readonly Pick<MappableQuestion, 'code' | 'label'>[]
): ColumnMapping {
	const byKey = indexBy(fields, (field) => field.key);
	const byLabel = indexBy(fields, (field) => field.label);

	const mapping: Record<string, string> = {};
	const taken = new Set<string>();

	for (const question of questions) {
		const code = toColumnKey(question.code);
		const label = toColumnKey(question.label);

		// Du plus sur au plus lache : cle contre code, libelle contre libelle,
		// puis les deux croisements.
		const match =
			byKey.get(code) ?? byLabel.get(label) ?? byLabel.get(code) ?? byKey.get(label);

		if (!match || taken.has(match)) continue;

		mapping[question.code] = match;
		taken.add(match);
	}

	return mapping;
}
