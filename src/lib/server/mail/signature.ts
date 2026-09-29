import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verification des webhooks Resend.
 *
 * Resend signe ses appels avec Svix. La verification est reecrite ici plutot
 * que confiee au paquet `svix` : elle tient en vingt lignes, et une dependance
 * de plus pour vingt lignes, c'est une surface d'attaque de plus a suivre.
 *
 * L'algorithme, tel que documente par Svix :
 *   contenu signe = `${svix-id}.${svix-timestamp}.${corps brut}`
 *   cle           = base64 du secret, prive de son prefixe `whsec_`
 *   signature     = base64(HMAC-SHA256(cle, contenu signe))
 * L'en-tete `svix-signature` porte une ou plusieurs signatures separees par
 * des espaces, chacune prefixee de sa version (`v1,...`) : il suffit qu'une
 * seule corresponde.
 *
 * Le corps doit etre le texte BRUT recu. Le relire apres `JSON.parse` puis
 * `JSON.stringify` changerait l'ordre ou les espaces, et la signature avec.
 */

/** Ecart tolere entre l'horodatage signe et l'horloge du serveur. */
export const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

export interface SignedRequest {
	readonly secret: string;
	readonly id: string | null;
	readonly timestamp: string | null;
	readonly signature: string | null;
	readonly body: string;
	/** Horloge injectee pour les tests. */
	readonly now?: number;
}

export type SignatureVerdict =
	| { readonly ok: true }
	| {
			readonly ok: false;
			readonly reason: 'missing-headers' | 'stale' | 'mismatch' | 'bad-secret';
	  };

function secretKey(secret: string): Buffer | null {
	const encoded = secret.trim().replace(/^whsec_/, '');
	if (encoded === '') return null;
	const key = Buffer.from(encoded, 'base64');
	return key.length === 0 ? null : key;
}

function sameSignature(expected: Buffer, candidate: string): boolean {
	const provided = Buffer.from(candidate, 'base64');
	return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export function verifySignature(request: SignedRequest): SignatureVerdict {
	const { id, timestamp, signature, body } = request;
	if (!id || !timestamp || !signature) return { ok: false, reason: 'missing-headers' };

	const key = secretKey(request.secret);
	if (key === null) return { ok: false, reason: 'bad-secret' };

	// Un horodatage ancien signe correctement reste un rejeu : on le refuse.
	const seconds = Number(timestamp);
	const now = (request.now ?? Date.now()) / 1000;
	if (!Number.isFinite(seconds) || Math.abs(now - seconds) > SIGNATURE_TOLERANCE_SECONDS) {
		return { ok: false, reason: 'stale' };
	}

	const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest();

	const matches = signature
		.split(' ')
		.map((entry) => entry.split(','))
		.some(
			([version, value]) =>
				version === 'v1' && value !== undefined && sameSignature(expected, value)
		);

	return matches ? { ok: true } : { ok: false, reason: 'mismatch' };
}
