import { prisma } from '$lib/server/db';
import { requirePermission } from '$lib/server/rbac/guard';
import { CONTENT_PAGES } from '$lib/shared/content';
import type { PageServerLoad } from './$types';

/**
 * Pages editables du site public.
 *
 * La liste vient du registre, pas de la base : une page existe parce que le
 * site a une route pour elle. Tant qu'elle n'a jamais ete publiee, elle n'a pas
 * de ligne en base et le site affiche son modele d'origine.
 */
export const load: PageServerLoad = async ({ locals }) => {
	requirePermission(locals.user, 'content.read');

	const rows = await prisma.contentPage.findMany({
		select: {
			key: true,
			status: true,
			publishedAt: true,
			updatedAt: true,
			updatedBy: { select: { displayName: true } },
			_count: { select: { blocks: true } }
		}
	});

	const byKey = new Map(rows.map((row) => [row.key, row]));

	return {
		pages: CONTENT_PAGES.map((page) => {
			const row = byKey.get(page.key);
			return {
				key: page.key,
				label: page.label,
				href: page.href,
				description: page.description,
				// Jamais editee : le site sert encore le modele d'origine du depot.
				status: row?.status ?? null,
				publishedAt: row?.publishedAt ?? null,
				updatedAt: row?.updatedAt ?? null,
				updatedBy: row?.updatedBy?.displayName ?? null,
				blockCount: row?._count.blocks ?? 0
			};
		})
	};
};
