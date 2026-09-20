import { prisma } from '$lib/server/db';
import { getContentTemplate, prepareTemplate } from '$lib/shared/content/templates';
import { TOUR_PHOTOS } from '$lib/shared/photos';
import { resolveThreshold } from '$lib/server/survey/queries';
import type { ContentBlockRecord, ContentPageKey } from '$lib/shared/content';
import type { ContentTokens } from '$lib/shared/content/tokens';

/**
 * Les sections d'une page publique.
 *
 * La base est la source de ce que le site affiche. Une page publiee sert ses
 * sections, meme s'il n'en reste aucune : vider une page est une decision
 * editoriale, et la contredire en reaffichant autre chose serait pire que la
 * page vide.
 *
 * Deux cas seulement servent le modele d'origine du depot :
 *
 * - la page n'a jamais ete publiee (installation neuve, ou page depubliee) :
 *   le site montre alors sa version de reference, celle qui a ete ecrite et
 *   composee, plutot qu'un blanc que personne n'a voulu ;
 * - la base est injoignable : le site reste debout sur son modele au lieu de
 *   rendre une erreur. Meme principe que la lecture de session dans
 *   `hooks.server.ts` (CLAUDE.md, decision 26).
 */
export async function pageBlocks(key: ContentPageKey): Promise<readonly ContentBlockRecord[]> {
	try {
		const published = await readPublished(key);
		return published ?? templateBlocks(key);
	} catch (error) {
		console.error('[contenu] lecture impossible', key, error);
		return templateBlocks(key);
	}
}

async function readPublished(key: ContentPageKey): Promise<readonly ContentBlockRecord[] | null> {
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

	if (!page || page.status !== 'PUBLISHED') return null;

	return page.blocks.map((block) => ({
		id: block.id,
		type: block.type,
		position: block.position,
		data: (block.data ?? {}) as Record<string, unknown>
	}));
}

/**
 * Le modele d'origine, rendu comme des sections.
 *
 * Il passe par la meme validation qu'une saisie : un modele qui ne passerait
 * pas est un bogue, et `templates.test.ts` le fait echouer avant la mise en
 * ligne. Si malgre tout il echouait ici, la page se rend vide plutot que de
 * lever — un contenu de secours n'a pas le droit d'etre la cause de la panne.
 */
function templateBlocks(key: ContentPageKey): readonly ContentBlockRecord[] {
	const template = getContentTemplate(key);
	if (!template) return [];

	const prepared = prepareTemplate(template);
	if (!prepared.ok) {
		console.error('[contenu] modèle invalide', key, prepared.reason);
		return [];
	}

	return prepared.blocks.map((block, index) => ({
		// Identifiant stable : il sert d'ancre aux titres de section, et une ancre
		// qui change a chaque chargement casserait les liens internes.
		id: `${key.toLowerCase()}-modele-${index}`,
		type: block.type,
		position: index,
		data: block.data
	}));
}

/**
 * Les valeurs que les textes peuvent citer.
 *
 * Le seuil est celui REELLEMENT applique, lu en base : une page qui annoncerait
 * « 5 » pendant que l'agregation en applique un autre serait pire que pas de
 * page du tout.
 */
export async function contentTokens(): Promise<ContentTokens> {
	const threshold = await resolveThreshold({ kAnonymityThreshold: null }).catch(() => null);

	return {
		...(threshold === null ? {} : { '{seuil}': String(threshold) }),
		'{photos}': String(TOUR_PHOTOS.length)
	};
}
