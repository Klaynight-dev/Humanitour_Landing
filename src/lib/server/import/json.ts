import type { ImportFormat, RowSet } from './types';

/**
 * Import JSON.
 *
 * Attend un tableau d objets plats, la forme que produit toute API de collecte.
 * Les colonnes sont l union des cles rencontrees : un objet auquel il manque une
 * cle vaut non-reponse sur cette question, il n est pas rejete.
 */
export const jsonFormat: ImportFormat = {
	key: 'json',
	label: 'JSON',
	extensions: ['.json'],
	mimeTypes: ['application/json'],

	parse(content): RowSet {
		const text = new TextDecoder('utf-8').decode(content);
		const parsed: unknown = JSON.parse(text);

		if (!Array.isArray(parsed)) {
			throw new Error("Le fichier JSON doit contenir un tableau d'objets.");
		}

		const rows = parsed.filter(
			(row): row is Record<string, unknown> =>
				typeof row === 'object' && row !== null && !Array.isArray(row)
		);

		if (rows.length !== parsed.length) {
			throw new Error('Toutes les entrées du tableau doivent être des objets.');
		}

		const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];

		return { columns, rows };
	}
};
