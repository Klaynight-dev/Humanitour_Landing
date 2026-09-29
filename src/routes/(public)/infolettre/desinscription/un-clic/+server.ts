import { text } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { newsletterLinkKey } from '$lib/server/mail/config';
import { verifyAddress } from '$lib/server/newsletter/links';
import { normalizeEmail } from '$lib/shared/newsletter';
import type { RequestHandler } from './$types';

/**
 * Desinscription en un clic (RFC 8058).
 *
 * C'est l'adresse de l'en-tete `List-Unsubscribe` de chaque campagne. Gmail,
 * Yahoo et Apple Mail l'appellent eux-memes, en `POST`, quand la personne
 * clique sur « Se desabonner » a cote de l'expediteur : il n'y a ni page, ni
 * confirmation, ni cookie. La RFC l'exige ainsi.
 *
 * Elle est exemptee du controle d'origine des formulaires (`server/csrf.ts`),
 * les messageries postant sans en-tete `Origin`. Ce qui la protege est la
 * signature HMAC de l'adresse, verifiee ici : sans elle, rien n'est retire.
 *
 * L'adresse est un contrat : elle est ecrite dans chaque courriel deja envoye.
 */
export const POST: RequestHandler = async ({ url }) => {
	const address = url.searchParams.get('adresse');
	const signature = url.searchParams.get('cle');
	if (!address || !signature) return text('Lien incomplet.', { status: 400 });

	const email = normalizeEmail(address);
	if (!verifyAddress(newsletterLinkKey(), email, signature)) {
		return text('Signature invalide.', { status: 403 });
	}

	await prisma.newsletterSubscriber.deleteMany({ where: { email } });
	return text('Adresse désinscrite.');
};
