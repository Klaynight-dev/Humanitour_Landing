import { recordAudit } from '$lib/server/audit';
import { prisma } from '$lib/server/db';
import { requirePermission } from '$lib/server/rbac/guard';
import { escapeCsv } from '$lib/server/survey/export';
import type { RequestHandler } from './$types';

/**
 * Export de la liste des abonnes.
 *
 * Journalise avant d'etre servi, et nominativement : sortir la seule table
 * identifiante du depot est une action qui doit pouvoir etre racontee
 * (AGENTS.md section 4). Le journal porte le nombre de lignes, jamais les
 * adresses elles-memes — un journal d'audit n'est pas un second fichier
 * d'abonnes.
 *
 * `escapeCsv` vient de l'export des sondages : une seule implementation de
 * l'echappement, utilisee partout (AGENTS.md section 1.5).
 */
/**
 * Marque d'ordre des octets, ecrite par son point de code et non collee telle
 * quelle : un caractere invisible dans un fichier source finit par se faire
 * supprimer par quelqu'un qui ne le voit pas.
 */
const BOM = String.fromCharCode(0xfeff);

export const GET: RequestHandler = async ({ locals }) => {
	const user = requirePermission(locals.user, 'newsletter.manage');

	const subscribers = await prisma.newsletterSubscriber.findMany({
		orderBy: { createdAt: 'asc' },
		select: { email: true, createdAt: true }
	});

	await recordAudit({
		actorId: user.id,
		action: 'newsletter.export',
		entity: 'NewsletterSubscriber',
		metadata: { count: subscribers.length }
	});

	const lines = ['adresse,date_inscription'];
	for (const subscriber of subscribers) {
		lines.push(
			[subscriber.email, subscriber.createdAt.toISOString().slice(0, 10)].map(escapeCsv).join(',')
		);
	}

	// BOM en tete : sans lui, Excel lit un fichier UTF-8 en ANSI et massacre les
	// accents des noms de domaine internationalises.
	const body = `${BOM}${lines.join('\r\n')}\r\n`;
	const stamp = new Date().toISOString().slice(0, 10);

	return new Response(body, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="abonnes-infolettre-${stamp}.csv"`,
			// Une liste d'adresses ne se met jamais en cache, nulle part.
			'cache-control': 'no-store'
		}
	});
};
