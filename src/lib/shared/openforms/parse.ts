import type {
	OpenformsCondition,
	OpenformsField,
	OpenformsGrid,
	OpenformsOption,
	OpenformsValidation
} from './types';

/**
 * Lecture du schema renvoye par Openforms.
 *
 * Le schema arrive en `Json` libre : Openforms l'a valide a l'ecriture, mais
 * rien ne garantit qu'il corresponde encore a ce que ce depot attend apres une
 * mise a jour de l'un des deux. On lit donc defensivement, champ par champ, et
 * on ECARTE ce qui n'a pas de cle exploitable plutot que de fabriquer une cle
 * de remplacement : une cle inventee ne correspondrait a rien a la soumission.
 */

function readString(raw: unknown): string | undefined {
	return typeof raw === 'string' && raw !== '' ? raw : undefined;
}

function readNumber(raw: unknown): number | undefined {
	return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
}

function readOptions(raw: unknown): readonly OpenformsOption[] {
	if (!Array.isArray(raw)) return [];

	return raw.flatMap((entry): OpenformsOption[] => {
		// Openforms accepte deux ecritures : une chaine seule, ou un objet etiquete.
		if (typeof entry === 'string') return [{ value: entry, label: entry }];
		if (!entry || typeof entry !== 'object') return [];

		const option = entry as { value?: unknown; label?: unknown; color?: unknown };
		const value = readString(option.value);
		if (!value) return [];

		return [{ value, label: readString(option.label) ?? value, color: readString(option.color) }];
	});
}

function readValidation(raw: unknown): OpenformsValidation | undefined {
	if (!raw || typeof raw !== 'object') return undefined;

	const rules = raw as Record<string, unknown>;
	const parsed: OpenformsValidation = {
		minLength: readNumber(rules.minLength),
		maxLength: readNumber(rules.maxLength),
		pattern: readString(rules.pattern),
		min: readNumber(rules.min),
		max: readNumber(rules.max)
	};

	return Object.values(parsed).some((entry) => entry !== undefined) ? parsed : undefined;
}

function readCondition(raw: unknown): OpenformsCondition | undefined {
	if (!raw || typeof raw !== 'object') return undefined;

	const condition = raw as { fieldKey?: unknown; value?: unknown };
	const fieldKey = readString(condition.fieldKey);
	if (!fieldKey) return undefined;

	return { fieldKey, value: typeof condition.value === 'string' ? condition.value : '' };
}

function readGrid(raw: unknown): OpenformsGrid | undefined {
	if (!raw || typeof raw !== 'object') return undefined;

	const grid = raw as { rows?: unknown; columns?: unknown };
	const rows = Array.isArray(grid.rows) ? grid.rows.filter((r): r is string => typeof r === 'string') : [];
	const columns = Array.isArray(grid.columns)
		? grid.columns.filter((c): c is string => typeof c === 'string')
		: [];

	return rows.length > 0 && columns.length > 0 ? { rows, columns } : undefined;
}

/** Un champ, ou `null` si la definition est inexploitable. */
function readField(raw: unknown): OpenformsField | null {
	if (!raw || typeof raw !== 'object') return null;

	const field = raw as Record<string, unknown>;
	const key = readString(field.key);
	const type = readString(field.type);
	if (!key || !type) return null;

	return {
		key,
		type,
		label: readString(field.label) ?? key,
		description: readString(field.description),
		placeholder: readString(field.placeholder),
		required: field.required === true,
		options: readOptions(field.options),
		allowOther: field.allowOther === true,
		condition: readCondition(field.condition),
		validation: readValidation(field.validation),
		grid: readGrid(field.grid)
	};
}

/** Les champs exploitables du schema, dans l'ordre du questionnaire. */
export function parseSchema(raw: unknown): readonly OpenformsField[] {
	if (!Array.isArray(raw)) return [];
	return raw.map(readField).filter((field): field is OpenformsField => field !== null);
}
