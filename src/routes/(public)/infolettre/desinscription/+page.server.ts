import { fail, redirect } from '@sveltejs/kit';
import { check, createThrottle, recordFailure } from '$lib/server/auth/throttle';
import { prisma } from '$lib/server/db';
import { readText } from '$lib/server/forms';
import { newsletterLinkKey } from '$lib/server/mail/config';
import { verifyAddress } from '$lib/server/newsletter/links';
import { normalizeEmail, parseEmail } from '$lib/shared/newsletter';
import type { Actions, PageServerLoad } from './$types';

/**
 * Desinscription de l'infolettre, par deux chemins.
 *
 * 1. Le lien signe, en pied de chaque courriel : l'adresse est deja connue et
 *    signee, la page n'affiche qu'un bouton. Le clic est un `POST`, parce que
 *    les antivirus des messageries ouvrent les liens pour les inspecter, et
 *    qu'une ouverture ne doit pas desinscrire.
 * 2. La saisie de l'adresse, pour qui n'a plus le courriel sous la main. Le
 *    cout de ce chemin est connu et assume : n'importe qui peut desinscrire
 *    l'adresse d'un autre. Il est le bon sens, parce que l'action ne fait que
 *    RETIRER une donnee ; elle ne divulgue rien et ne cree aucun abonnement.
 *
 * Dans les deux cas, la reponse est la meme que l'adresse ait ete trouvee ou
 * non : la difference dirait qui est dans la liste.
 */

const unsubscribeThrottle = createThrottle();
const THROTTLE_KEY = 'desinscription';

/** L'adresse d'un lien signe, ou `null` si le lien est absent ou falsifie. */
function signedAddress(address: string | null, signature: string | null): string | null {
	if (!address || !signature) return null;
	const email = normalizeEmail(address);
	return verifyAddress(newsletterLinkKey(), email, signature) ? email : null;
}

export const load: PageServerLoad = ({ url }) => {
	return {
		done: url.searchParams.has('fait'),
		signed: signedAddress(url.searchParams.get('adresse'), url.searchParams.get('cle')),
		signature: url.searchParams.get('cle')
	};
};

export const actions: Actions = {
	signed: async ({ request }) => {
		const form = await request.formData();
		const email = signedAddress(readText(form, 'adresse'), readText(form, 'cle'));
		if (!email) {
			return fail(400, {
				email: '',
				message: 'Ce lien de désinscription est incomplet. Saisissez votre adresse ci-dessous.'
			});
		}

		await prisma.newsletterSubscriber.deleteMany({ where: { email } });
		redirect(303, '/infolettre/desinscription?fait');
	},

	typed: async ({ request, getClientAddress }) => {
		const form = await request.formData();
		const raw = readText(form, 'email');
		const ip = getClientAddress();

		const verdict = check(unsubscribeThrottle, THROTTLE_KEY, ip);
		if (verdict.blocked) {
			const minutes = Math.ceil(verdict.retryAfterSeconds / 60);
			return fail(429, {
				email: raw,
				message: `Trop de demandes depuis cette connexion. Réessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.`
			});
		}

		recordFailure(unsubscribeThrottle, THROTTLE_KEY, ip);

		const parsed = parseEmail(raw);
		if (!parsed.ok) {
			return fail(400, { email: raw, message: parsed.reason });
		}

		// `deleteMany` et non `delete` : la suppression d'une adresse absente est
		// un succes, pas une erreur. C'est ce qui rend la reponse identique dans
		// les deux cas.
		await prisma.newsletterSubscriber.deleteMany({ where: { email: parsed.email } });

		redirect(303, '/infolettre/desinscription?fait');
	}
};
