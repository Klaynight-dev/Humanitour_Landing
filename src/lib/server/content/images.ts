import { imageDimensions } from '$lib/server/media/dimensions';
import { safeKeySegment, storage } from '$lib/server/storage';
import { TOUR_PHOTOS } from '$lib/shared/photos';
import { TEAM } from '$lib/shared/site';
import type { LibraryGroup, LibraryImage } from '$lib/shared/content/library';

/**
 * Les images que le back-office propose.
 *
 * Trois provenances, et c'est voulu : les photographies du tour et les
 * portraits de l'equipe sont dans le depot, avec leurs dimensions relevees sur
 * les fichiers eux-memes et leur description deja ecrite. Les proposer telles
 * quelles evite de redeposer un cliche qui est deja la, et surtout de le
 * redecrire moins bien.
 *
 * La troisieme provenance est le depot de televersement, pour tout ce qui
 * n'existe pas encore.
 */

/** Sous-dossier de stockage. Les images de contenu ne se melangent pas aux imports. */
const PREFIX = 'contenu';

/** Adresse publique d'un fichier televerse. Sert de contrat a la route de service. */
export const UPLOAD_BASE = '/televersements';

export type { LibraryGroup, LibraryImage };

/** Les formats acceptes au televersement, et leur extension de service. */
const TYPES: Readonly<Record<string, string>> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/gif': 'gif',
	'image/avif': 'avif'
};

/** 8 Mo : au-dela, c'est une image a retailler avant, pas a servir telle quelle. */
const MAX_BYTES = 8 * 1024 * 1024;

export function contentTypeFor(key: string): string {
	const extension = key.split('.').pop()?.toLowerCase() ?? '';
	const found = Object.entries(TYPES).find(([, value]) => value === extension);
	return found?.[0] ?? 'application/octet-stream';
}

export async function listLibrary(): Promise<readonly LibraryGroup[]> {
	const uploaded = await storage()
		.list(PREFIX)
		.catch(() => []);

	return [
		{
			label: 'Photographies du tour',
			images: TOUR_PHOTOS.map((photo) => ({
				src: photo.src,
				alt: photo.alt,
				width: photo.width,
				height: photo.height
			}))
		},
		{
			label: 'Portraits de l’équipe',
			// Les portraits sont carres et de meme definition : ils viennent tous de
			// la meme page de la plaquette.
			images: TEAM.map((member) => ({
				src: `/equipe/${member.slug}.jpg`,
				alt: `Portrait de ${member.name}, ${member.role.toLowerCase()}`,
				width: 420,
				height: 420
			}))
		},
		{
			label: 'Images téléversées',
			images: uploaded.map((key) => ({ src: `${UPLOAD_BASE}/${key.slice(PREFIX.length + 1)}`, alt: '' }))
		}
	];
}

export type UploadResult =
	| { readonly ok: true; readonly image: LibraryImage }
	| { readonly ok: false; readonly reason: string };

/**
 * Depose une image et rend son adresse publique.
 *
 * Les dimensions sont relevees a l'arrivee : personne ne va ouvrir le fichier
 * pour les noter, et sans elles la page saute au chargement. Le nom est
 * assaini et prefixe de l'horodatage, pour que deposer deux fois « photo.jpg »
 * ne remplace pas la premiere.
 */
export async function uploadImage(file: File): Promise<UploadResult> {
	const extension = TYPES[file.type];
	if (extension === undefined) {
		return { ok: false, reason: 'Formats acceptés : JPEG, PNG, WebP, GIF et AVIF.' };
	}

	if (file.size > MAX_BYTES) {
		return { ok: false, reason: 'Image trop lourde : 8 Mo au maximum.' };
	}

	const bytes = new Uint8Array(await file.arrayBuffer());
	const base = safeKeySegment(file.name.replace(/\.[^.]+$/, ''));
	const key = `${PREFIX}/${Date.now()}-${base}.${extension}`;

	await storage().put(key, bytes, file.type);

	const size = imageDimensions(bytes);
	return {
		ok: true,
		image: {
			src: `${UPLOAD_BASE}/${key.slice(PREFIX.length + 1)}`,
			alt: '',
			...(size === null ? {} : size)
		}
	};
}

/** Lit un fichier televerse, a partir du chemin public. */
export async function readUpload(path: string): Promise<Uint8Array> {
	return storage().get(`${PREFIX}/${path}`);
}
