import { env } from '$env/dynamic/private';
import { localStorage } from './local';
import type { StorageDriver } from './types';

/**
 * Registre des backends de stockage.
 *
 * Ajouter un backend : ecrire le fichier, l'ajouter a cette liste, changer
 * STORAGE_DRIVER dans l'environnement.
 */
const REGISTERED: readonly StorageDriver[] = [localStorage];

export function storage(): StorageDriver {
	const requested = env.STORAGE_DRIVER ?? 'local';
	const driver = REGISTERED.find((candidate) => candidate.key === requested);

	if (!driver) {
		throw new Error(
			`Backend de stockage inconnu : « ${requested} ». Disponibles : ${REGISTERED.map((d) => d.key).join(', ')}.`
		);
	}

	return driver;
}

export * from './types';
