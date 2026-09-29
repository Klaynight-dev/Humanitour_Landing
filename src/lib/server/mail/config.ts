import { createHmac } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { SITE } from '$lib/shared/site';
import { createResendClient, type ResendClient } from './resend';

/**
 * Configuration de l'envoi, lue dans l'environnement.
 *
 * Sans `RESEND_TOKEN`, rien ne part et tout le dit : la confirmation
 * d'inscription, la diffusion d'une campagne et l'envoi depuis la messagerie
 * rendent une erreur lisible au lieu d'echouer en silence. Le reste du site
 * fonctionne normalement.
 */

/** Adresse des courriels systeme : confirmation d'inscription, invitation. */
export function systemSender(): string {
	return env.MAIL_FROM?.trim() || `${SITE.name} <${SITE.email}>`;
}

/** Adresse d'expedition de l'infolettre. */
export function newsletterSender(): string {
	return env.NEWSLETTER_FROM?.trim() || `${SITE.name} <infolettre@${SITE.domain}>`;
}

/**
 * Le domaine dont les adresses peuvent devenir des boites.
 *
 * Resend ne recoit que pour un domaine verifie : creer une boite
 * `contact@autre.fr` produirait une boite ou rien n'arrive jamais.
 */
export function mailDomain(): string {
	return (env.MAIL_DOMAIN?.trim() || SITE.domain).toLowerCase();
}

/** Le secret `whsec_` du webhook, tel que Resend l'affiche a sa creation. */
export function webhookSecret(): string | null {
	const value = env.RESEND_WEBHOOK_PRAVATE_KEY?.trim();
	return value ? value : null;
}

/**
 * L'origine ecrite dans les liens des courriels.
 *
 * Un courriel part parfois hors de toute requete (synchronisation Openforms,
 * minuterie) : l'origine vient alors de `PUBLIC_SITE_URL`. Dans une requete,
 * l'origine de la requete sert de repli si la variable manque.
 */
export function siteOrigin(fallback?: string): string {
	const configured = publicEnv.PUBLIC_SITE_URL?.trim();
	return (configured || fallback || `https://${SITE.domain}`).replace(/\/$/, '');
}

/**
 * Cle des liens de desinscription, derivee du secret de session.
 *
 * Derivee plutot que reprise telle quelle : un lien de desinscription ne doit
 * rien pouvoir apprendre sur la cle qui protege les sessions, et le libelle
 * separe les deux usages.
 */
export function newsletterLinkKey(): Uint8Array {
	const secret = env.SESSION_SECRET?.trim();
	if (!secret)
		throw new Error(
			'SESSION_SECRET est absent : les liens de désinscription ne peuvent pas être signés.'
		);
	return createHmac('sha256', secret).update('humanitour:infolettre:desinscription').digest();
}

export function isMailConfigured(): boolean {
	return Boolean(env.RESEND_TOKEN?.trim());
}

export class MailNotConfiguredError extends Error {
	constructor() {
		super("L'envoi de courriels n'est pas configuré : RESEND_TOKEN est absent de l'environnement.");
		this.name = 'MailNotConfiguredError';
	}
}

let client: ResendClient | null = null;

export function resend(): ResendClient {
	const token = env.RESEND_TOKEN?.trim();
	if (!token) throw new MailNotConfiguredError();
	client ??= createResendClient({ token });
	return client;
}
