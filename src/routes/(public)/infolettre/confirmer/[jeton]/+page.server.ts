import { redirect } from '@sveltejs/kit';
import { hashSessionToken } from '$lib/server/auth/session';
import { prisma } from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

/**
 * Confirmation d'une inscription a l'infolettre.
 *
 * Ouvrir le lien ne confirme rien : la page propose un bouton, et c'est le
 * `POST` qui confirme. Les antivirus des messageries ouvrent les liens d'un
 * courriel pour les inspecter ; confirmer a l'ouverture ferait confirmer
 * l'inscription par un robot, et le double opt-in ne prouverait plus rien.
 *
 * Un jeton inconnu donne la meme page qu'un jeton deja utilise : la
 * confirmation l'efface, et dire « deja confirme » a qui presente un jeton
 * quelconque n'apprendrait rien d'utile a personne.
 */

async function findPending(token: string) {
	if (!/^[\w-]{20,64}$/.test(token)) return null;
	return prisma.newsletterSubscriber.findUnique({
		where: { confirmationTokenHash: hashSessionToken(token) },
		select: { id: true, email: true, confirmedAt: true }
	});
}

export const load: PageServerLoad = async ({ params, url }) => {
	if (url.searchParams.has('confirme')) return { state: 'confirmed' as const, email: null };

	const subscriber = await findPending(params.jeton);
	if (!subscriber) return { state: 'unknown' as const, email: null };

	return { state: 'pending' as const, email: subscriber.email };
};

export const actions: Actions = {
	default: async ({ params }) => {
		const subscriber = await findPending(params.jeton);
		if (!subscriber) redirect(303, `/infolettre/confirmer/${params.jeton}`);

		await prisma.newsletterSubscriber.update({
			where: { id: subscriber.id },
			data: { confirmedAt: subscriber.confirmedAt ?? new Date(), confirmationTokenHash: null }
		});

		redirect(303, `/infolettre/confirmer/${params.jeton}?confirme`);
	}
};
