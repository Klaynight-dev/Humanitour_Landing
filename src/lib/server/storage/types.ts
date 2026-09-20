/**
 * Contrat du registre de stockage de fichiers.
 *
 * Une seule implementation aujourd'hui — le disque local, qui correspond au
 * deploiement Docker sur VPS. Le contrat existe parce qu'un objet S3 ou MinIO
 * arrivera le jour ou le site aura plusieurs instances, et qu'il ne doit alors
 * rien changer ailleurs.
 */

export interface StoredFile {
	/** Chemin logique, stocke en base. Jamais une URL. */
	readonly key: string;
	readonly size: number;
	readonly contentType: string;
}

export interface StorageDriver {
	readonly key: string;
	put(key: string, content: Uint8Array, contentType: string): Promise<StoredFile>;
	get(key: string): Promise<Uint8Array>;
	remove(key: string): Promise<void>;
	/**
	 * Les cles rangees sous un prefixe.
	 *
	 * Le back-office propose de reutiliser une image deja televersee plutot que
	 * de la redeposer : sans lecture du depot, chaque page repartirait d'un
	 * champ vide et le meme fichier finirait stocke cinq fois.
	 *
	 * Un prefixe inconnu rend une liste vide, jamais une erreur : « rien n'a
	 * encore ete depose » n'est pas une panne.
	 */
	list(prefix: string): Promise<readonly string[]>;
}

/**
 * Assainit un nom de fichier pour en faire une cle de stockage.
 *
 * Le nom vient d'un televersement : il peut contenir des separateurs de chemin,
 * des points d'echappement, ou des caracteres qui n'existent pas sur le systeme
 * de fichiers cible. On ne conserve que ce dont on est sur.
 */
export function safeKeySegment(filename: string): string {
	const base = filename.split(/[\\/]/).pop() ?? 'fichier';

	const cleaned = base
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-zA-Z0-9._-]/g, '-')
		.replace(/-{2,}/g, '-')
		.replace(/^[.-]+/, '')
		.slice(0, 120);

	return cleaned === '' ? 'fichier' : cleaned;
}
