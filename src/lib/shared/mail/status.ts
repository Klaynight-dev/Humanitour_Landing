/**
 * L'etat d'un courriel et la facon dont les webhooks le font avancer.
 *
 * Resend ne garantit pas l'ordre de ses evenements : un `email.sent` peut
 * arriver apres un `email.delivered`. Appliquer chaque evenement tel quel
 * ferait donc reculer un courriel remis a « envoye ». La regle est ici, pure et
 * testee, plutot que dans chaque route qui recoit un evenement.
 *
 * Les valeurs reprennent l'enumeration Prisma `MailStatus`.
 */

export const MAIL_STATUSES = [
	'RECEIVED',
	'QUEUED',
	'SENT',
	'DELIVERED',
	'DELAYED',
	'BOUNCED',
	'COMPLAINED',
	'FAILED'
] as const;

export type MailStatusKey = (typeof MAIL_STATUSES)[number];

/** Evenements Resend qui portent un etat d'envoi. */
const EVENT_STATUS: Readonly<Record<string, MailStatusKey>> = {
	'email.sent': 'SENT',
	'email.delivered': 'DELIVERED',
	'email.delivery_delayed': 'DELAYED',
	'email.bounced': 'BOUNCED',
	// Adresse sur la liste de suppression de Resend : rien n'est parti, pour la
	// meme raison qu'un rebond definitif.
	'email.suppressed': 'BOUNCED',
	'email.complained': 'COMPLAINED',
	'email.failed': 'FAILED'
};

export function statusForEvent(type: string): MailStatusKey | null {
	return EVENT_STATUS[type] ?? null;
}

/**
 * Rang de progression : un etat ne cede la place qu'a un etat de rang
 * strictement superieur. Les echecs se situent au-dessus de la remise, parce
 * qu'un rebond peut arriver apres un accuse de remise ; la plainte est au
 * sommet, parce qu'elle suit toujours une remise.
 */
const RANK: Readonly<Record<MailStatusKey, number>> = {
	RECEIVED: 99,
	QUEUED: 0,
	SENT: 1,
	DELAYED: 2,
	DELIVERED: 3,
	FAILED: 4,
	BOUNCED: 4,
	COMPLAINED: 5
};

/** L'etat qui resulte d'un evenement, ou `null` s'il ne change rien. */
export function advanceStatus(current: MailStatusKey, next: MailStatusKey): MailStatusKey | null {
	if (current === next || current === 'RECEIVED') return null;
	return RANK[next] > RANK[current] ? next : null;
}

export type CampaignCounter = 'deliveredCount' | 'bouncedCount' | 'complainedCount' | 'failedCount';

const COUNTER: Partial<Record<MailStatusKey, CampaignCounter>> = {
	DELIVERED: 'deliveredCount',
	BOUNCED: 'bouncedCount',
	COMPLAINED: 'complainedCount',
	FAILED: 'failedCount'
};

/**
 * Les compteurs de campagne a ajuster quand un envoi change d'etat.
 *
 * Une plainte suit une remise : le courriel reste compte comme remis. Un rebond
 * ou un echec apres un accuse de remise, en revanche, le retire des remis.
 */
export function counterChanges(
	from: MailStatusKey,
	to: MailStatusKey
): { readonly increment: CampaignCounter | null; readonly decrement: CampaignCounter | null } {
	const increment = COUNTER[to] ?? null;
	const decrement =
		from === 'DELIVERED' && (to === 'BOUNCED' || to === 'FAILED') ? 'deliveredCount' : null;
	return { increment, decrement };
}

/** Ce que l'ecran affiche pour chaque etat. */
export const STATUS_LABELS: Readonly<Record<MailStatusKey, string>> = {
	RECEIVED: 'Reçu',
	QUEUED: 'En attente',
	SENT: 'Envoyé',
	DELIVERED: 'Remis',
	DELAYED: 'Retardé',
	BOUNCED: 'Rejeté',
	COMPLAINED: 'Signalé comme indésirable',
	FAILED: 'Échec'
};

/** Un etat qui demande l'attention de l'equipe. */
export function isProblem(status: MailStatusKey): boolean {
	return (
		status === 'BOUNCED' || status === 'COMPLAINED' || status === 'FAILED' || status === 'DELAYED'
	);
}
