/**
 * Qui peut lire une boite.
 *
 * Une boite personnelle : son titulaire, et lui seul. Une boite partagee : ses
 * membres. Aucune permission n'ouvre une boite de plus, pas meme `mail.admin`,
 * qui choisit les membres sans lire le courrier. Un administrateur qui doit
 * lire `contact@` s'ajoute a ses membres, et cet ajout est journalise.
 */

export interface MailboxAccessInfo {
	readonly kind: 'SHARED' | 'PERSONAL';
	readonly ownerId: string | null;
	readonly memberIds: readonly string[];
}

export function canUseMailbox(mailbox: MailboxAccessInfo, userId: string): boolean {
	if (mailbox.kind === 'PERSONAL') return mailbox.ownerId === userId;
	return mailbox.memberIds.includes(userId);
}
