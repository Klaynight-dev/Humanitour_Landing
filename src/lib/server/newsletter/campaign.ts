import { recordAudit } from '$lib/server/audit';
import { prisma } from '$lib/server/db';
import { newsletterLinkKey, newsletterSender, resend } from '$lib/server/mail/config';
import { MAIL_KINDS } from '$lib/server/mail/events';
import { BATCH_SIZE, type OutgoingEmail } from '$lib/server/mail/resend';
import { batchKey, PAUSE_BETWEEN_BATCHES_MS, testSubject } from './batches';
import { campaignEmail, type CampaignContent } from './emails';
import { listUnsubscribeHeaders, unsubscribeUrl } from './links';

/**
 * Diffusion d'une campagne.
 *
 * Trois temps, dans cet ordre, pour qu'une diffusion interrompue (processus
 * redemarre, quota atteint, panne reseau) reprenne sans envoyer deux fois :
 *
 * 1. Une ligne `NewsletterDelivery` par adresse confirmee, creee AVANT tout
 *    appel a Resend. La liste des destinataires est ainsi figee au depart :
 *    une inscription confirmee pendant l'envoi attendra la campagne suivante.
 * 2. Les envois sans identifiant Resend partent par lots de cent, chacun avec
 *    une cle d'idempotence qui depend de son contenu.
 * 3. L'identifiant rendu par Resend est ecrit sur chaque envoi : c'est lui qui
 *    le marque comme parti, et que les webhooks retrouvent ensuite.
 *
 * La diffusion tourne en arriere-plan : l'ecran du back-office suit sa
 * progression, et un bouton « Reprendre » relance les envois restants.
 */

/** Diffusions en cours dans ce processus : un double clic n'en lance pas deux. */
const running = new Set<string>();

export function isRunning(campaignId: string): boolean {
	return running.has(campaignId);
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function outgoing(
	campaign: CampaignContent & { id: string },
	origin: string,
	email: string
): OutgoingEmail {
	const key = newsletterLinkKey();
	const rendered = campaignEmail(campaign, origin, unsubscribeUrl(origin, key, email));
	return {
		from: newsletterSender(),
		to: [email],
		subject: campaign.subject,
		html: rendered.html,
		text: rendered.text,
		headers: listUnsubscribeHeaders(origin, key, email),
		tags: { kind: MAIL_KINDS.campaign, campaign: campaign.id }
	};
}

/** Fige la liste des destinataires : une ligne d'envoi par adresse confirmee. */
async function freezeRecipients(campaignId: string): Promise<number> {
	const subscribers = await prisma.newsletterSubscriber.findMany({
		where: { confirmedAt: { not: null } },
		select: { id: true }
	});

	await prisma.newsletterDelivery.createMany({
		data: subscribers.map((subscriber) => ({ campaignId, subscriberId: subscriber.id })),
		skipDuplicates: true
	});

	return prisma.newsletterDelivery.count({ where: { campaignId } });
}

async function sendPending(
	campaign: CampaignContent & { id: string },
	origin: string
): Promise<void> {
	for (;;) {
		// Un envoi refuse par Resend passe en `FAILED` et sort de la file : sans
		// ce filtre sur l'etat, il reviendrait a chaque tour, sans fin.
		const batch = await prisma.newsletterDelivery.findMany({
			where: { campaignId: campaign.id, resendId: null, status: 'QUEUED' },
			orderBy: { id: 'asc' },
			take: BATCH_SIZE,
			select: { id: true, subscriber: { select: { email: true } } }
		});
		if (batch.length === 0) return;

		const emails = batch.map((delivery) => outgoing(campaign, origin, delivery.subscriber.email));
		const { ids } = await resend().sendBatch(
			emails,
			batchKey(
				campaign.id,
				batch.map((delivery) => delivery.id)
			)
		);
		const sent = ids.filter(Boolean).length;

		await prisma.$transaction([
			...batch.map((delivery, index) =>
				prisma.newsletterDelivery.update({
					where: { id: delivery.id },
					data: ids[index] ? { resendId: ids[index], status: 'SENT' } : { status: 'FAILED' }
				})
			),
			prisma.newsletterCampaign.update({
				where: { id: campaign.id },
				data: {
					sentCount: { increment: sent },
					failedCount: { increment: batch.length - sent },
					lastError: null
				}
			})
		]);

		await sleep(PAUSE_BETWEEN_BATCHES_MS);
	}
}

async function run(campaignId: string, origin: string): Promise<void> {
	try {
		const campaign = await prisma.newsletterCampaign.findUniqueOrThrow({
			where: { id: campaignId },
			select: { id: true, subject: true, preheader: true, markdown: true }
		});

		const recipientCount = await freezeRecipients(campaignId);
		await prisma.newsletterCampaign.update({ where: { id: campaignId }, data: { recipientCount } });

		await sendPending(campaign, origin);

		await prisma.newsletterCampaign.update({
			where: { id: campaignId },
			data: { status: 'SENT', sentAt: new Date(), lastError: null }
		});
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		console.error('[infolettre] diffusion interrompue', campaignId, error);
		await prisma.newsletterCampaign
			.update({ where: { id: campaignId }, data: { lastError: detail } })
			.catch(() => undefined);
	} finally {
		running.delete(campaignId);
	}
}

/**
 * Lance ou reprend la diffusion, sans l'attendre.
 *
 * Rend `false` si elle tourne deja dans ce processus. Une campagne deja
 * entierement envoyee ne repart pas : son statut `SENT` l'en empeche.
 */
export async function startCampaign(
	campaignId: string,
	actorId: string,
	origin: string
): Promise<boolean> {
	if (running.has(campaignId)) return false;

	const { count } = await prisma.newsletterCampaign.updateMany({
		where: { id: campaignId, status: { in: ['DRAFT', 'SENDING'] } },
		data: { status: 'SENDING', sentById: actorId, lastError: null }
	});
	if (count === 0) return false;

	running.add(campaignId);
	await recordAudit({
		actorId,
		action: 'newsletter.campaign.send',
		entity: 'NewsletterCampaign',
		entityId: campaignId
	});

	void run(campaignId, origin);
	return true;
}

/**
 * Un essai, a une seule adresse : celle du membre de l'equipe qui le demande.
 *
 * Le lien de desinscription d'un essai pointe vers l'adresse de l'essai : il
 * fonctionne, et desinscrirait ce membre s'il etait abonne. C'est le prix d'un
 * essai fidele a ce que recevront les abonnes.
 */
export async function sendTest(
	campaign: CampaignContent & { id: string },
	to: string,
	origin: string
): Promise<void> {
	const email = outgoing(campaign, origin, to);
	await resend().send({
		...email,
		subject: testSubject(campaign.subject),
		tags: { kind: MAIL_KINDS.test, campaign: campaign.id }
	});
}
