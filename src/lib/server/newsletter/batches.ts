/**
 * Decoupage d'une diffusion en lots.
 *
 * Resend accepte cent courriels par appel de lot, et, par defaut, deux appels
 * par seconde. La diffusion avance donc lot par lot, avec une pause entre deux.
 */

export const PAUSE_BETWEEN_BATCHES_MS = 600;

/**
 * Cle d'idempotence d'un lot.
 *
 * Elle depend des envois qu'il contient : si le processus s'arrete apres
 * l'appel mais avant d'avoir note les identifiants, la reprise renvoie le
 * MEME lot avec la MEME cle, et Resend rend le resultat du premier appel au
 * lieu d'envoyer deux fois. Resend garde une cle vingt-quatre heures.
 */
export function batchKey(campaignId: string, deliveryIds: readonly string[]): string {
	const first = deliveryIds[0] ?? 'vide';
	const last = deliveryIds.at(-1) ?? 'vide';
	return `campagne-${campaignId}-${first}-${last}-${deliveryIds.length}`;
}

/** Objet d'un envoi d'essai : on doit le reconnaitre dans sa boite. */
export function testSubject(subject: string): string {
	return `[Essai] ${subject}`;
}
