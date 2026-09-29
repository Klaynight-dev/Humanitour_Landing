import { safeKeySegment } from '$lib/server/storage/types';
import { parseMailbox } from '$lib/shared/mail/address';

/**
 * Les regles de la reception, sans base ni reseau.
 *
 * `inbound.ts` interroge la base et appelle Resend ; tout ce qu'il decide vit
 * ici, pour etre teste sans l'un ni l'autre.
 */

export interface RoutableMailbox {
	readonly id: string;
	readonly address: string;
	readonly isCatchAll: boolean;
}

/**
 * Les boites qui recoivent un courriel.
 *
 * Toute adresse destinataire compte : `To`, `Cc`, et l'adresse pour laquelle
 * Resend a effectivement recu le message (`received_for`), qui est la seule a
 * porter une copie cachee ou une redirection. Un courriel ecrit a `contact@` et
 * `elouan@` entre dans les deux boites, chacune avec son propre fil.
 *
 * Aucune boite ne correspond : le courriel va a la boite « attrape-tout ».
 * Sans elle, il n'est remis a personne, et l'appelant le journalise.
 */
export function routeToMailboxes(
	recipients: readonly string[],
	mailboxes: readonly RoutableMailbox[]
): string[] {
	const addresses = new Set(
		recipients.map((raw) => parseMailbox(raw)?.address).filter((address) => address !== undefined)
	);

	const matched = mailboxes
		.filter((mailbox) => addresses.has(mailbox.address))
		.map((mailbox) => mailbox.id);
	if (matched.length > 0) return matched;

	const catchAll = mailboxes.find((mailbox) => mailbox.isCatchAll);
	return catchAll ? [catchAll.id] : [];
}

/**
 * Un courriel qui echoue a DMARC pretend venir d'un domaine qui ne l'a pas
 * envoye : c'est la signature de l'usurpation. Il est classe en indesirables,
 * jamais supprime : l'equipe garde le dernier mot.
 */
export function isSpoofed(authentication: Readonly<Record<string, string>>): boolean {
	return authentication.dmarc?.toLowerCase() === 'fail';
}

/**
 * Cle de stockage d'une piece jointe recue.
 *
 * Rangee sous `courrier/`, que la route publique `/televersements` ne sert pas
 * (elle ne lit que `contenu/`) : une piece jointe ne se telecharge qu'a travers
 * la messagerie, apres controle d'acces a la boite.
 */
export function attachmentKey(
	resendId: string,
	attachmentId: string,
	filename: string | null
): string {
	return `courrier/${safeKeySegment(resendId)}/${safeKeySegment(attachmentId)}-${safeKeySegment(filename ?? 'piece-jointe')}`;
}

/** Les correspondants d'un message, hors la boite qui le recoit ou l'envoie. */
export function participantsOf(addresses: readonly string[], mailboxAddress: string): string[] {
	const found: string[] = [];
	for (const raw of addresses) {
		const address = parseMailbox(raw)?.address;
		if (address && address !== mailboxAddress && !found.includes(address)) found.push(address);
	}
	return found;
}

/** Fusionne deux listes de correspondants, dans l'ordre d'apparition. */
export function mergeParticipants(current: readonly string[], added: readonly string[]): string[] {
	return [...new Set([...current, ...added])];
}

/** Une piece jointe integree au corps (image `cid:`), plutot que jointe a cote. */
export function isInlineAttachment(disposition: string | null, contentId: string | null): boolean {
	return disposition?.toLowerCase() === 'inline' && contentId !== null && contentId !== '';
}

/**
 * Le dossier d'un fil qui recoit un nouveau message.
 *
 * Une reponse ramene le fil en boite de reception s'il avait ete archive ou
 * jete : c'est ce qu'on attend d'une messagerie. Un fil classe en indesirables
 * y reste, l'equipe l'en sortira elle-meme.
 */
export function folderAfterReply<F extends string>(folder: F | 'ARCHIVE' | 'TRASH'): F | 'INBOX' {
	return folder === 'ARCHIVE' || folder === 'TRASH' ? 'INBOX' : folder;
}
