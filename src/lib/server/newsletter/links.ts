import { createHmac, timingSafeEqual } from 'node:crypto';
import { SITE } from '$lib/shared/site';

/**
 * Liens de desinscription signes.
 *
 * Le lien porte l'adresse et une signature HMAC de cette adresse : il
 * desinscrit en un clic sans jeton stocke en base, et personne ne peut en
 * fabriquer un pour l'adresse d'un autre sans la cle. La cle derive du secret
 * de session (`mail/config.ts`), elle ne demande donc aucune variable de plus.
 *
 * Le lien n'expire pas : un courriel de 2026 relu en 2028 doit toujours
 * permettre de partir. Changer le secret de session invalide les anciens
 * liens ; la page de desinscription par saisie reste alors le recours.
 */

/** 128 bits de signature : largement hors de portee d'une recherche exhaustive. */
const SIGNATURE_LENGTH = 22;

export function signAddress(key: Uint8Array, email: string): string {
	return createHmac('sha256', key).update(email).digest('base64url').slice(0, SIGNATURE_LENGTH);
}

export function verifyAddress(key: Uint8Array, email: string, signature: string): boolean {
	const expected = Buffer.from(signAddress(key, email));
	const provided = Buffer.from(signature);
	return provided.length === expected.length && timingSafeEqual(provided, expected);
}

function withAddress(origin: string, path: string, key: Uint8Array, email: string): string {
	const query = `adresse=${encodeURIComponent(email)}&cle=${signAddress(key, email)}`;
	return `${origin.replace(/\/$/, '')}${path}?${query}`;
}

/** La page, avec son bouton : ce qu'ouvre le lien en pied de courriel. */
export function unsubscribeUrl(origin: string, key: Uint8Array, email: string): string {
	return withAddress(origin, '/infolettre/desinscription', key, email);
}

/** Le point d'entree que les messageries appellent seules, en `POST`. */
export function oneClickUrl(origin: string, key: Uint8Array, email: string): string {
	return withAddress(origin, '/infolettre/desinscription/un-clic', key, email);
}

/**
 * En-tetes de desinscription (RFC 2369 et RFC 8058).
 *
 * Gmail et Yahoo les exigent des expediteurs en nombre depuis 2024, et les
 * affichent sous forme d'un bouton « Se desabonner » a cote de l'expediteur.
 * `List-Unsubscribe-Post` dit que le lien accepte un `POST` sans confirmation :
 * c'est la condition du desabonnement en un clic.
 */
export function listUnsubscribeHeaders(
	origin: string,
	key: Uint8Array,
	email: string
): Record<string, string> {
	return {
		'List-Unsubscribe': `<${oneClickUrl(origin, key, email)}>, <mailto:${SITE.email}?subject=D%C3%A9sinscription>`,
		'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
	};
}
