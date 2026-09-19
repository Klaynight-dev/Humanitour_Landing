import { figuresType } from './figures';
import { heroType } from './hero';
import { quoteType } from './quote';
import { richTextType } from './rich-text';
import type { ContentBlockType, ContentPageKey } from './types';

/**
 * Registre des blocs de contenu.
 *
 * Ajouter un type de bloc : ecrire le fichier, l ajouter a cette liste. Rien
 * d autre — ni colonne en base, ni `switch` dans une page.
 */
const REGISTERED: readonly ContentBlockType[] = [heroType, richTextType, figuresType, quoteType];

const BY_KEY = new Map(REGISTERED.map((type) => [type.key, type]));

export const CONTENT_BLOCK_TYPES = REGISTERED;

export function getContentBlockType(key: string): ContentBlockType | null {
	return BY_KEY.get(key) ?? null;
}

export function requireContentBlockType(key: string): ContentBlockType {
	const type = BY_KEY.get(key);
	if (!type) throw new Error(`Type de bloc inconnu : « ${key} ».`);
	return type;
}

/**
 * Les pages editables, dans l ordre du menu.
 *
 * Liste fermee : ce sont les pages du site qui existent, pas un constructeur de
 * pages arbitraires. Une page ajoutee ici doit exister cote public.
 */
export const CONTENT_PAGES: readonly {
	readonly key: ContentPageKey;
	readonly label: string;
	readonly href: string;
	readonly description: string;
}[] = [
	{
		key: 'HOME',
		label: 'Accueil',
		href: '/',
		description: "La page d'accueil : couverture, chiffres du tour, engagements."
	},
	{
		key: 'ABOUT',
		label: 'À propos',
		href: '/a-propos',
		description: "Qui est l'association, son équipe et son incubateur."
	},
	{
		key: 'TOUR',
		label: 'Le tour',
		href: '/le-tour',
		description: 'Le récit du tour de France à vélo et de la collecte.'
	}
];

export function getContentPage(key: string) {
	return CONTENT_PAGES.find((page) => page.key === key) ?? null;
}

export * from './types';
