import { prisma } from '$lib/server/db';
import type { ContentBlockRecord, ContentPageKey } from '$lib/shared/content';

/**
 * Contenu editorial d une page publique.
 *
 * Rend `null` tant que la page n a pas ete publiee depuis le back-office. La
 * page publique sert alors le contenu ecrit dans le code, exactement comme
 * avant l existence du CMS : un contenu absent n affiche jamais du blanc, et
 * depublier suffit a revenir en arriere.
 */
export async function publishedBlocks(
	key: ContentPageKey
): Promise<readonly ContentBlockRecord[] | null> {
	const page = await prisma.contentPage.findUnique({
		where: { key },
		select: {
			status: true,
			blocks: {
				orderBy: { position: 'asc' },
				select: { id: true, type: true, position: true, data: true }
			}
		}
	});

	if (!page || page.status !== 'PUBLISHED' || page.blocks.length === 0) return null;

	return page.blocks.map((block) => ({
		id: block.id,
		type: block.type,
		position: block.position,
		data: (block.data ?? {}) as Record<string, unknown>
	}));
}
