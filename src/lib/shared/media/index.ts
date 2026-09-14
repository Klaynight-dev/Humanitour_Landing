import { articleType } from './article';
import { podcastType } from './podcast';
import { pressType } from './press';
import type { MediaKind, MediaType } from './types';
import { videoType } from './video';

/**
 * Registre des natures de media.
 *
 * Ajouter une nature : ecrire le fichier, l ajouter a cette liste, ajouter la
 * valeur a l enum `MediaKind` du schema Prisma. Rien d autre.
 */
const REGISTERED: readonly MediaType[] = [articleType, videoType, podcastType, pressType];

const BY_KEY = new Map(REGISTERED.map((type) => [type.key, type]));

export const MEDIA_TYPES = REGISTERED;

export function getMediaType(key: string): MediaType | null {
	return BY_KEY.get(key as MediaKind) ?? null;
}

export function requireMediaType(key: string): MediaType {
	const type = BY_KEY.get(key as MediaKind);
	if (!type) throw new Error(`Nature de média inconnue : « ${key} ».`);
	return type;
}

export * from './embed';
export * from './types';
