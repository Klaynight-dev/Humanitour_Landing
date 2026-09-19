import { csvFormat } from './csv';
import { jsonFormat } from './json';
import type { ImportFormat } from './types';
import { xlsxFormat } from './xlsx';

/**
 * Registre des formats d import.
 *
 * Ajouter un format : ecrire le fichier, l ajouter a cette liste.
 */
const REGISTERED: readonly ImportFormat[] = [csvFormat, xlsxFormat, jsonFormat];

export const IMPORT_FORMATS = REGISTERED;

export function getImportFormat(key: string): ImportFormat | null {
	return REGISTERED.find((format) => format.key === key) ?? null;
}

/** Devine le format d apres le nom de fichier, puis d apres le type MIME. */
export function detectImportFormat(filename: string, mimeType?: string): ImportFormat | null {
	const lower = filename.toLowerCase();

	const byExtension = REGISTERED.find((format) =>
		format.extensions.some((extension) => lower.endsWith(extension))
	);
	if (byExtension) return byExtension;

	if (!mimeType) return null;
	return REGISTERED.find((format) => format.mimeTypes.includes(mimeType)) ?? null;
}

export * from './mapper';
export * from './storage-key';
export * from './types';
