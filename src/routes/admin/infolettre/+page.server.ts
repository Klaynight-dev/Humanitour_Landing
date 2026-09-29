import { fail } from '@sveltejs/kit';
import { recordAudit } from '$lib/server/audit';
import { prisma } from '$lib/server/db';
import { readText } from '$lib/server/forms';
import { isMailConfigured, siteOrigin } from '$lib/server/mail/config';
import { requestConfirmation } from '$lib/server/newsletter/confirmation';
import { requirePermission } from '$lib/server/rbac/guard';
import { normalizeEmail, parseEmailList } from '$lib/shared/newsletter';
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
 * 3. L'export, la desinscription et l'import sont journalises. Qui a sorti la
 *    liste, ou qui l'a agrandie, doit pouvoir etre dit.
 *
 * Les campagnes se redigent et se diffusent a cote, sous
 * `/admin/infolettre/campagnes`. Ici, on gere la liste : qui est confirme, qui
 * attend, et le renvoi d'un lien de confirmation perdu.
 *
 * Deux entrees alimentent la table en dehors du formulaire public : l'import
 * en lot ci-dessous, et un champ email d'un formulaire Openforms relie a un
 * sondage (`server/openforms/sync.ts`). Aucune des deux ne cree de lien vers
 * une reponse : l'infolettre reste la seule table nominative du depot, et
 * `NewsletterSubscriber` n'a et ne peut avoir aucune cle vers `Response`
 * (AGENTS.md section 4).
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
		select: { id: true, email: true, createdAt: true, confirmedAt: true }
	});

	const day = 24 * 60 * 60 * 1000;
	const lastThirty = await prisma.newsletterSubscriber.count({
		where: { createdAt: { gte: new Date(Date.now() - 30 * day) } }
	});

	const confirmed = await prisma.newsletterSubscriber.count({
		where: { confirmedAt: { not: null } }
	});

	return {
		subscribers,
		total,
		confirmed,
		pending: total - confirmed,
		mailConfigured: isMailConfigured(),
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
	},

	/**
	 * Import en lot, colle depuis un tableur ou une liste.
	 *
	 * Pas d'upload de fichier : une colonne de tableur se colle telle quelle, et
	 * ca evite de faire revivre un analyseur de fichier pour un besoin qu'un
	 * `<textarea>` couvre deja (AGENTS.md section 2, sur le registre de formats
	 * d'import retire). `createMany` avec `skipDuplicates` fait qu'une adresse
	 * deja abonnee ne s'ecrase pas et ne remet pas sa date d'inscription a zero.
	 */
	import: async ({ locals, request }) => {
		const user = requirePermission(locals.user, 'newsletter.manage');

		const form = await request.formData();
		const { emails, invalid } = parseEmailList(readText(form, 'emails'));

		if (emails.length === 0) {
			return fail(400, {
				message:
					invalid.length > 0
						? `Aucune adresse valide dans ce que vous avez collé : ${invalid.length} entrée(s) rejetée(s).`
						: 'Collez au moins une adresse.'
			});
		}

		const already = await prisma.newsletterSubscriber.findMany({
			where: { email: { in: [...emails] } },
			select: { email: true }
		});
		const knownCount = already.length;

		const { count: created } = await prisma.newsletterSubscriber.createMany({
			// Confirmees d'office : le consentement a ete recueilli ailleurs, et
			// c'est l'auteur de l'import, journalise, qui en repond.
			data: emails.map((email) => ({ email, confirmedAt: new Date() })),
			skipDuplicates: true
		});

		await recordAudit({
			actorId: user.id,
			action: 'newsletter.import',
			entity: 'NewsletterSubscriber',
			metadata: {
				submitted: emails.length,
				created,
				alreadySubscribed: knownCount,
				invalid: invalid.length
			}
		});

		const invalidNote =
			invalid.length > 0 ? ` ${invalid.length} entrée(s) invalide(s) ignorée(s).` : '';

		return {
			message: `${created} adresse(s) ajoutée(s) à l'infolettre. ${knownCount} l'étaient déjà.${invalidNote}`
		};
	},

	/**
	 * Renvoi du lien de confirmation a une adresse en attente, quand la
	 * personne dit ne rien avoir recu. Le delai entre deux envois s'applique
	 * aussi ici : l'equipe ne peut pas davantage bombarder une boite.
	 */
	resendConfirmation: async ({ locals, request, url }) => {
		const user = requirePermission(locals.user, 'newsletter.manage');

		const form = await request.formData();
		const email = normalizeEmail(readText(form, 'email'));

		let outcome;
		try {
			outcome = await requestConfirmation(email, siteOrigin(url.origin));
		} catch (error) {
			const detail = error instanceof Error ? error.message : String(error);
			return fail(502, { message: `Envoi impossible : ${detail}` });
		}

		const messages = {
			sent: `Lien de confirmation renvoyé à « ${email} ».`,
			cooldown: `Un lien est parti vers « ${email} » il y a moins de dix minutes. Attendez avant de le renvoyer.`,
			confirmed: `« ${email} » est déjà confirmée.`,
			missing: `Aucun abonnement pour « ${email} ».`,
			'not-configured': "L'envoi de courriels n'est pas configuré : RESEND_TOKEN est absent."
		} as const;

		if (outcome !== 'sent') return fail(400, { message: messages[outcome] });

		await recordAudit({
			actorId: user.id,
			action: 'newsletter.resendConfirmation',
			entity: 'NewsletterSubscriber',
			metadata: { email }
		});

		return { message: messages.sent };
	}
};
