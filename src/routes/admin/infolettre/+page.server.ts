import { fail } from '@sveltejs/kit';
import { recordAudit } from '$lib/server/audit';
import { prisma } from '$lib/server/db';
import { readText } from '$lib/server/forms';
import { requirePermission } from '$lib/server/rbac/guard';
import { normalizeEmail } from '$lib/shared/newsletter';
import { can } from '$lib/shared/permissions';
import type { Actions, PageServerLoad } from './$types';

/**
 * Les personnes abonnees a l'infolettre.
 *
 * C'est le SEUL ecran du back-office qui affiche une donnee directement
 * identifiante (AGENTS.md section 4). Trois consequences, et elles sont dans le
 * code, pas dans une intention :
 *
 * 1. Deux permissions distinctes. Consulter n'est pas exporter ni desabonner
 *    quelqu'un a sa place.
 * 2. La consultation est paginee et jamais exhaustive par defaut : on ne charge
 *    pas dix mille adresses dans une page pour le plaisir de les avoir.
 * 3. L'export et la desinscription sont journalises nominativement. Qui a sorti
 *    la liste des adresses doit pouvoir etre dit.
 *
 * Rien ici n'envoie de courriel : aucun expediteur n'est branche dans ce depot,
 * et la redaction d'une campagne attend ce choix.
 */

/** Une page de cinquante lignes : assez pour travailler, trop peu pour aspirer la liste. */
const PAGE_SIZE = 50;

function readPage(raw: string | null): number {
	const value = Number.parseInt(raw ?? '1', 10);
	return Number.isFinite(value) && value > 1 ? value : 1;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requirePermission(locals.user, 'newsletter.read');

	const search = normalizeEmail(url.searchParams.get('q') ?? '');
	const page = readPage(url.searchParams.get('page'));

	const where = search === '' ? {} : { email: { contains: search, mode: 'insensitive' as const } };

	const total = await prisma.newsletterSubscriber.count();
	const matching = search === '' ? total : await prisma.newsletterSubscriber.count({ where });

	const subscribers = await prisma.newsletterSubscriber.findMany({
		where,
		orderBy: { createdAt: 'desc' },
		skip: (page - 1) * PAGE_SIZE,
		take: PAGE_SIZE,
		// `ipHash` n'est jamais selectionne : c'est une preuve de consentement,
		// pas une colonne d'ecran. Elle ne sort de la base pour personne.
		select: { id: true, email: true, createdAt: true }
	});

	const day = 24 * 60 * 60 * 1000;
	const lastThirty = await prisma.newsletterSubscriber.count({
		where: { createdAt: { gte: new Date(Date.now() - 30 * day) } }
	});

	return {
		subscribers,
		total,
		matching,
		lastThirty,
		search,
		page,
		pageSize: PAGE_SIZE,
		pages: Math.max(1, Math.ceil(matching / PAGE_SIZE)),
		manageable: can(user, 'newsletter.manage')
	};
};

export const actions: Actions = {
	/**
	 * Desinscription a la place de quelqu'un.
	 *
	 * Le site public permet deja a une personne de se desinscrire elle-meme.
	 * Cette action-ci sert au cas ou elle le demande autrement : par courriel, en
	 * reunion, de vive voix. Elle est donc journalisee avec l'adresse concernee,
	 * parce qu'une suppression sans trace ne se distingue pas d'une perte.
	 */
	unsubscribe: async ({ locals, request }) => {
		const user = requirePermission(locals.user, 'newsletter.manage');

		const form = await request.formData();
		const email = normalizeEmail(readText(form, 'email'));
		if (email === '') return fail(400, { message: 'Adresse manquante.' });

		const removed = await prisma.newsletterSubscriber.deleteMany({ where: { email } });
		if (removed.count === 0) {
			return fail(404, { message: `Aucun abonnement pour « ${email} ».` });
		}

		await recordAudit({
			actorId: user.id,
			action: 'newsletter.unsubscribe',
			entity: 'NewsletterSubscriber',
			metadata: { email }
		});

		return { message: `« ${email} » ne recevra plus l'infolettre.` };
	}
};
