import { fail, redirect } from '@sveltejs/kit';
import { check, createThrottle, recordFailure } from '$lib/server/auth/throttle';
import { prisma } from '$lib/server/db';
import { readText } from '$lib/server/forms';
import { parseEmail } from '$lib/shared/newsletter';
import type { Actions, PageServerLoad } from './$types';

/**
 * Desinscription de l'infolettre.
 *
 * Par saisie de l'adresse, et non par un lien signe : rien n'envoie de courriel
 * dans ce depot, donc un lien signe n'arriverait jamais a son destinataire. Le
 * cout de ce choix est connu et assume — n'importe qui peut desinscrire
 * l'adresse d'un autre — et il est le bon sens : l'action ne fait que RETIRER
 * une donnee. Une desinscription abusive ne divulgue rien et ne cree aucun
 * abonnement.
 *
 * Comme a l'inscription, la reponse est la meme que l'adresse ait ete trouvee
 * ou non : la difference dirait qui est dans la liste.
 */

const unsubscribeThrottle = createThrottle();
const THROTTLE_KEY = 'desinscription';

export const load: PageServerLoad = ({ url }) => {
	return { done: url.searchParams.has('fait') };
};

export const actions: Actions = {
	default: async ({ request, getClientAddress }) => {
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
