import Papa from 'papaparse';
import type { ImportFormat, RowSet } from './types';

/**
 * Import CSV.
 *
 * Le delimiteur n est pas impose : les exports francais utilisent aussi bien la
 * virgule que le point-virgule, et un tableur configure en francais produit du
 * point-virgule par defaut. Papaparse le devine par ligne d en-tete.
 */
export const csvFormat: ImportFormat = {
	key: 'csv',
	label: 'CSV',
	extensions: ['.csv', '.txt'],
	mimeTypes: ['text/csv', 'text/plain', 'application/csv'],

	parse(content): RowSet {
		// Le BOM des exports Windows deviendrait sinon un prefixe invisible sur le
		// nom de la premiere colonne, qui ne correspondrait alors plus a rien.
		const text = new TextDecoder('utf-8').decode(content).replace(/^\uFEFF/, '');

		const parsed = Papa.parse<Record<string, unknown>>(text, {
			header: true,
			skipEmptyLines: 'greedy',
			transformHeader: (header) => header.trim()
		});

		const columns = parsed.meta.fields?.map((field) => field.trim()) ?? [];

		return { columns, rows: parsed.data };
	}
};
