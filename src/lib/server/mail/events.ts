import { recordAudit } from '$lib/server/audit';
import { prisma } from '$lib/server/db';
import { normalizeEmail } from '$lib/shared/newsletter';
import {
	advanceStatus,
	counterChanges,
	statusForEvent,
	type MailStatusKey
} from '$lib/shared/mail/status';
import { publishMailbox } from './live';
import { isPermanentFailure, type WebhookEvent } from './webhook-event';

/**
 * Evenements de remise : `sent`, `delivered`, `bounced`, `complained`...
 *
 * Un meme identifiant Resend peut designer un message de la messagerie ou un
 * envoi d'infolettre ; les deux sont cherches, et l'etat n'avance que dans le
 * sens permis par `advanceStatus`.
 *
 * Une adresse qui rebondit definitivement ou qui signale l'infolettre comme
 * indesirable en est retiree sur-le-champ. Continuer a lui ecrire degraderait
 * la reputation d'envoi du domaine, et pour une plainte, ce serait ignorer
 * une demande explicite. Le retrait est journalise sans auteur : c'est le
 * systeme qui l'a decide, et le journal doit le dire.
 */

/** L'etiquette `kind` posee sur chaque envoi : elle dit d'ou il vient. */
export const MAIL_KINDS = {
	campaign: 'campaign',
	mailbox: 'mailbox',
	confirmation: 'confirmation',
	invitation: 'invitation',
	test: 'test'
} as const;

export interface DeliveryOutcome {
	readonly messages: number;
	readonly deliveries: number;
	readonly unsubscribed: readonly string[];
}

async function updateMessages(
	emailId: string,
	status: MailStatusKey,
	detail: string | null
): Promise<number> {
	const messages = await prisma.mailMessage.findMany({
		where: { resendId: emailId, direction: 'OUTBOUND' },
		select: { id: true, status: true, mailboxId: true }
	});

	let changed = 0;
	for (const message of messages) {
		const next = advanceStatus(message.status, status);
		if (next === null) continue;
		await prisma.mailMessage.update({
			where: { id: message.id },
			data: { status: next, statusDetail: detail ?? undefined }
		});
		changed += 1;
		publishMailbox(message.mailboxId);
	}
	return changed;
}

async function updateDelivery(emailId: string, status: MailStatusKey): Promise<number> {
	const delivery = await prisma.newsletterDelivery.findUnique({
		where: { resendId: emailId },
		select: { id: true, status: true, campaignId: true }
	});
	if (!delivery) return 0;

	const next = advanceStatus(delivery.status, status);
	if (next === null) return 0;

	const { increment, decrement } = counterChanges(delivery.status, next);
	const counters: Record<string, { increment: number } | { decrement: number }> = {};
	if (increment) counters[increment] = { increment: 1 };
	if (decrement) counters[decrement] = { decrement: 1 };

	await prisma.$transaction([
		prisma.newsletterDelivery.update({ where: { id: delivery.id }, data: { status: next } }),
		prisma.newsletterCampaign.update({ where: { id: delivery.campaignId }, data: counters })
	]);
	return 1;
}

/**
 * Retire de l'infolettre les adresses d'un envoi qui ne doit plus se repeter.
 *
 * Ne s'applique qu'aux courriels de l'infolettre (campagne, confirmation,
 * essai exclu) : un rebond sur une reponse de la messagerie ne dit rien du
 * consentement de quelqu'un a recevoir l'infolettre.
 */
async function unsubscribeIfNeeded(event: WebhookEvent): Promise<string[]> {
	const kind = event.tags.kind;
	if (kind !== MAIL_KINDS.campaign && kind !== MAIL_KINDS.confirmation) return [];

	const complained = event.type === 'email.complained';
	if (!complained && !isPermanentFailure(event)) return [];

	const emails = event.to.map(normalizeEmail);
	const { count } = await prisma.newsletterSubscriber.deleteMany({
		where: { email: { in: emails } }
	});
	if (count === 0) return [];

	await recordAudit({
		actorId: null,
		action: 'newsletter.autoUnsubscribe',
		entity: 'NewsletterSubscriber',
		metadata: { emails, reason: complained ? 'complaint' : 'bounce', detail: event.detail }
	});
	return emails;
}

export async function applyDeliveryEvent(event: WebhookEvent): Promise<DeliveryOutcome> {
	const status = statusForEvent(event.type);
	if (status === null || event.emailId === null)
		return { messages: 0, deliveries: 0, unsubscribed: [] };

	const messages = await updateMessages(event.emailId, status, event.detail);
	const deliveries = await updateDelivery(event.emailId, status);
	const unsubscribed = await unsubscribeIfNeeded(event);

	return { messages, deliveries, unsubscribed };
}
