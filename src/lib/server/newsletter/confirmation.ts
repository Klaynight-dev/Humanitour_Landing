import { generateSessionToken, hashSessionToken } from '$lib/server/auth/session';
import { prisma } from '$lib/server/db';
import { isMailConfigured, resend, systemSender } from '$lib/server/mail/config';
import { MAIL_KINDS } from '$lib/server/mail/events';
import { PENDING_RETENTION_MS } from '$lib/shared/newsletter';
import { CONFIRMATION_SUBJECT, confirmationEmail, confirmationUrl } from './emails';

/**
 * Le second temps du double opt-in : le courriel qui porte le lien de
 * confirmation.
 *
 * Le jeton suit la regle des sessions : la base n'en garde que l'empreinte, le
 * jeton en clair n'existe que dans le courriel. Un nouvel envoi remplace le
 * jeton precedent, qui cesse de fonctionner.
 */

/** Delai minimal entre deux courriels de confirmation a la meme adresse. */
export const CONFIRMATION_COOLDOWN_MS = 10 * 60 * 1000;

export type ConfirmationOutcome = 'sent' | 'cooldown' | 'confirmed' | 'missing' | 'not-configured';

/**
 * Envoie le lien de confirmation a une adresse non confirmee.
 *
 * Ne dit jamais a l'appelant public si l'adresse etait deja inscrite : c'est
 * lui qui choisit de rendre la meme reponse dans tous les cas. Le delai entre
 * deux envois empeche de faire de ce formulaire un canon a courriels dirige
 * contre la boite de quelqu'un.
 */
export async function requestConfirmation(
	email: string,
	origin: string
): Promise<ConfirmationOutcome> {
	const subscriber = await prisma.newsletterSubscriber.findUnique({
		where: { email },
		select: { id: true, confirmedAt: true, confirmationSentAt: true }
	});

	if (!subscriber) return 'missing';
	if (subscriber.confirmedAt) return 'confirmed';
	if (!isMailConfigured()) return 'not-configured';

	const last = subscriber.confirmationSentAt?.getTime() ?? 0;
	if (Date.now() - last < CONFIRMATION_COOLDOWN_MS) return 'cooldown';

	const token = generateSessionToken();
	await prisma.newsletterSubscriber.update({
		where: { id: subscriber.id },
		data: { confirmationTokenHash: hashSessionToken(token), confirmationSentAt: new Date() }
	});

	const { html, text } = confirmationEmail(confirmationUrl(origin, token));
	await resend().send(
		{
			from: systemSender(),
			to: [email],
			subject: CONFIRMATION_SUBJECT,
			html,
			text,
			tags: { kind: MAIL_KINDS.confirmation }
		},
		`confirmation-${subscriber.id}-${hashSessionToken(token).slice(0, 16)}`
	);

	return 'sent';
}

/** Efface les inscriptions restees sans confirmation au-dela du delai annonce. */
export async function purgeStalePending(): Promise<number> {
	const { count } = await prisma.newsletterSubscriber.deleteMany({
		where: { confirmedAt: null, createdAt: { lt: new Date(Date.now() - PENDING_RETENTION_MS) } }
	});
	return count;
}
