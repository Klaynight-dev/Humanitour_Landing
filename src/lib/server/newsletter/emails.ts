import { brandedEmail, type RenderedEmail } from '$lib/shared/mail/layout';
import { PENDING_RETENTION_DAYS } from '$lib/shared/newsletter';

/**
 * Le texte des courriels de l'infolettre.
 *
 * Separe de leur envoi pour etre relu et teste sans base ni reseau : c'est ce
 * que la personne lit, et un lien casse ici est une inscription impossible.
 */

export const CONFIRMATION_SUBJECT = 'Confirmez votre inscription à l’infolettre d’Humanitour';

export function confirmationUrl(origin: string, token: string): string {
	return `${origin.replace(/\/$/, '')}/infolettre/confirmer/${token}`;
}

export function confirmationEmail(url: string): RenderedEmail {
	return brandedEmail({
		subject: CONFIRMATION_SUBJECT,
		preheader: 'Un clic, et vous serez prévenu·e de chaque publication.',
		reason: `Vous recevez ce courriel parce que votre adresse a été saisie pour recevoir l’infolettre d’Humanitour. Sans confirmation de votre part, elle sera effacée dans ${PENDING_RETENTION_DAYS} jours.`,
		markdown: [
			'# Encore un clic',
			'Quelqu’un, sans doute vous, a demandé à recevoir l’infolettre d’Humanitour à cette adresse. Nous écrivons quand il y a quelque chose à lire : les résultats de l’enquête, la série documentaire, et rien d’autre.',
			`-> [Confirmer mon inscription](${url})`,
			'Si vous n’êtes pas à l’origine de cette demande, ignorez ce message : sans confirmation, votre adresse ne recevra rien et sera effacée.'
		].join('\n\n')
	});
}

export interface CampaignContent {
	readonly subject: string;
	readonly preheader: string | null;
	readonly markdown: string;
}

/** Pourquoi un abonne recoit une campagne : la phrase du pied de courriel. */
export const CAMPAIGN_REASON =
	'Vous recevez ce courriel parce que vous vous êtes inscrit·e à l’infolettre d’Humanitour et avez confirmé votre adresse.';

/**
 * Une campagne rendue pour un destinataire.
 *
 * Le corps est le meme pour tous ; seul le lien de desinscription change,
 * parce qu'il porte l'adresse signee de la personne. Les liens relatifs
 * (`/donnees`) sont completes avec l'origine publique du site.
 */
export function campaignEmail(
	campaign: CampaignContent,
	origin: string,
	unsubscribeUrl: string
): RenderedEmail {
	return brandedEmail({
		subject: campaign.subject,
		preheader: campaign.preheader ?? undefined,
		markdown: campaign.markdown,
		reason: CAMPAIGN_REASON,
		unsubscribeUrl,
		origin
	});
}
