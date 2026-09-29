import { json } from '@sveltejs/kit';
import { webhookSecret } from '$lib/server/mail/config';
import { applyDeliveryEvent } from '$lib/server/mail/events';
import { receiveEmail } from '$lib/server/mail/inbound';
import { verifySignature } from '$lib/server/mail/signature';
import { parseWebhookEvent } from '$lib/server/mail/webhook-event';
import type { RequestHandler } from './$types';

/**
 * Webhook Resend : courrier recu et suivi des envois.
 *
 * Adresse a declarer chez Resend (Webhooks, « Add endpoint ») :
 *   https://humanitour.fr/api/resend/webhook
 * Evenements : email.received, email.sent, email.delivered,
 * email.delivery_delayed, email.bounced, email.complained, email.failed,
 * email.suppressed. Le secret `whsec_` affiche a la creation va dans
 * `RESEND_WEBHOOK_PRAVATE_KEY`.
 *
 * L'adresse est un contrat au sens d'AGENTS.md section 1.4 : elle est inscrite
 * chez Resend, et la renommer couperait la reception du courrier sans que rien
 * ne le signale ici.
 *
 * Contrairement au webhook d'Openforms, celui-ci est signe (Svix) et la
 * signature est verifiee sur le corps BRUT. Pour la reception, sa charge ne
 * sert pourtant que de signal : le courriel lui-meme est relu chez Resend avec
 * la cle d'API (`server/mail/inbound.ts`).
 *
 * Codes de reponse : Resend rejoue tout ce qui n'est pas 2xx, pendant
 * plusieurs heures. Un echec passager (base, reseau) rend donc 500 pour etre
 * rejoue, et le traitement est idempotent pour que le rejeu soit sans effet
 * de bord. Ce qui ne s'arrangera pas en rejouant — evenement inconnu, courriel
 * sans boite — rend 200.
 */
export const POST: RequestHandler = async ({ request }) => {
	const secret = webhookSecret();
	if (!secret) {
		return json({ error: 'Le webhook Resend n’est pas configuré.' }, { status: 503 });
	}

	const body = await request.text();
	const verdict = verifySignature({
		secret,
		id: request.headers.get('svix-id'),
		timestamp: request.headers.get('svix-timestamp'),
		signature: request.headers.get('svix-signature'),
		body
	});

	if (!verdict.ok) {
		return json({ error: 'Signature invalide.', reason: verdict.reason }, { status: 401 });
	}

	let payload: unknown;
	try {
		payload = JSON.parse(body);
	} catch {
		return json({ error: 'Corps illisible.' }, { status: 400 });
	}

	const event = parseWebhookEvent(payload);
	if (!event) return json({ error: 'Événement sans type.' }, { status: 400 });

	try {
		if (event.type === 'email.received') {
			if (!event.emailId) return json({ ignored: 'Courriel sans identifiant.' });
			return json(await receiveEmail(event.emailId));
		}

		return json(await applyDeliveryEvent(event));
	} catch (error) {
		console.error('[resend] traitement du webhook en echec', event.type, event.emailId, error);
		return json({ error: 'Traitement impossible, Resend rejouera l’appel.' }, { status: 500 });
	}
};
