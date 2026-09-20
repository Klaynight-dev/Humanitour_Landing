import { fail, redirect } from '@sveltejs/kit';
import { hashIp } from '$lib/server/auth/session';
import { check, createThrottle, recordFailure } from '$lib/server/auth/throttle';
import { prisma } from '$lib/server/db';
import { readCheckbox, readText } from '$lib/server/forms';
import { parseEmail } from '$lib/shared/newsletter';
import type { Actions, PageServerLoad } from './$types';

/**
 * Inscription a l'infolettre.
 *
 * Seul endroit du site public qui ecrit une adresse electronique en base. Trois
 * choses en decoulent, et aucune n'est optionnelle :
 *
 * 1. Le consentement est une case a cocher, decochee par defaut, sans laquelle
 *    l'action refuse. Une case pre-cochee n'est pas un consentement.
 * 2. La reponse est la MEME qu'on vienne de s'inscrire ou qu'on le soit deja.
 *    Dire « vous etes deja inscrit » transformerait ce formulaire en oracle :
 *    n'importe qui pourrait verifier si une adresse est dans la liste.
 * 3. Le formulaire est freine par adresse IP. C'est un point d'ecriture ouvert
 *    a tous : sans frein, une seule boucle remplit la table.
 */

/**
 * Le frein des connexions, reutilise tel quel.
 *
 * Ici, TOUTE soumission compte, reussie ou non : le risque n'est pas qu'on
 * devine un mot de passe, c'est le volume. `recordFailure` n'incremente qu'un
 * compteur de fenetre ; c'est son nom qui parle de connexion, pas son effet.
 */
const subscribeThrottle = createThrottle();

/** Une seule cle : le formulaire n'a pas d'identifiant a viser, juste une IP. */
const THROTTLE_KEY = 'infolettre';

export const load: PageServerLoad = ({ url }) => {
	// Inscription reussie : la page revient en GET (voir le `redirect` plus bas),
	// pour qu'un rafraichissement ne repose pas la meme adresse.
	return { subscribed: url.searchParams.has('inscrit') };
};

export const actions: Actions = {
	default: async ({ request, getClientAddress }) => {
		const form = await request.formData();
		const raw = readText(form, 'email');
		const consent = readCheckbox(form, 'consentement');
		const ip = getClientAddress();

		const verdict = check(subscribeThrottle, THROTTLE_KEY, ip);
		if (verdict.blocked) {
			const minutes = Math.ceil(verdict.retryAfterSeconds / 60);
			return fail(429, {
				email: raw,
				message: `Trop de demandes depuis cette connexion. Réessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.`
			});
		}

		recordFailure(subscribeThrottle, THROTTLE_KEY, ip);

		if (!consent) {
			return fail(400, {
				email: raw,
				message: 'Cochez la case pour confirmer votre accord : sans elle, rien n’est enregistré.'
			});
		}

		const parsed = parseEmail(raw);
		if (!parsed.ok) {
			return fail(400, { email: raw, message: parsed.reason });
		}

		// `upsert` et non `create` : une seconde inscription de la meme adresse ne
		// doit ni echouer bruyamment, ni ecraser la date du premier consentement.
		await prisma.newsletterSubscriber.upsert({
			where: { email: parsed.email },
			create: { email: parsed.email, ipHash: hashIp(ip) },
			update: {}
		});

		redirect(303, '/infolettre?inscrit');
	}
};
