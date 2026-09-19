import { openforms } from './openforms';
import type { DataSource } from './types';

/**
 * Registre des sources de donnees distantes.
 *
 * Ajouter une source : ecrire le fichier, l ajouter a cette liste. Aucun
 * `switch` ailleurs (`AGENTS.md` section 2), et rien a changer dans la chaine
 * d import, qui ne connait que `RowSet`.
 */
const REGISTERED: readonly DataSource[] = [openforms];

export const DATA_SOURCES = REGISTERED;

export function getDataSource(key: string): DataSource | null {
	return REGISTERED.find((source) => source.key === key) ?? null;
}

/** Sources reellement utilisables : celles dont la configuration est presente. */
export function configuredDataSources(): readonly DataSource[] {
	return REGISTERED.filter((source) => source.isConfigured());
}

export * from './types';
