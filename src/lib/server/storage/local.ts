import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { env } from '$env/dynamic/private';
import type { StorageDriver, StoredFile } from './types';

/** Racine de stockage. Configurable, parce qu'un volume Docker n'est pas ./var. */
function root(): string {
	return resolve(env.STORAGE_LOCAL_PATH ?? './var/storage');
}

/**
 * Resout une cle en chemin absolu, sans sortir de la racine.
 *
 * Une cle du type `../../etc/passwd` doit echouer, pas remonter l'arborescence.
 * On compare le chemin resolu a la racine plutot que de filtrer les « .. » a la
 * main : les filtres se contournent, la comparaison non.
 */
function resolveKey(key: string): string {
	const base = root();
	const target = resolve(join(base, key));

	if (target !== base && !target.startsWith(base + sep)) {
		throw new Error(`Cle de stockage hors racine : ${key}`);
	}

	return target;
}

export const localStorage: StorageDriver = {
	key: 'local',

	async put(key, content, contentType): Promise<StoredFile> {
		const target = resolveKey(key);
		await mkdir(dirname(target), { recursive: true });
		await writeFile(target, content);

		return { key, size: content.byteLength, contentType };
	},

	async get(key): Promise<Uint8Array> {
		return new Uint8Array(await readFile(resolveKey(key)));
	},

	async remove(key): Promise<void> {
		await rm(resolveKey(key), { force: true });
	}
};
