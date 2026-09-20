import { error, fail } from '@sveltejs/kit';
import { recordAudit } from '$lib/server/audit';
import { contentTokens } from '$lib/server/content/queries';
import { listLibrary } from '$lib/server/content/images';
import { prisma } from '$lib/server/db';
import { readText } from '$lib/server/forms';
import { notify } from '$lib/server/notifications/emit';
import { requirePermission } from '$lib/server/rbac/guard';
import {
	contentBlockLibrary,
	getContentBlockType,
	getContentPage,
	type ContentPageKey
} from '$lib/shared/content';
import { getContentTemplate, prepareTemplate } from '$lib/shared/content/templates';
import { CONTENT_TOKENS } from '$lib/shared/content/tokens';
import { TEAM } from '$lib/shared/site';
import type { Actions, PageServerLoad } from './$types';

/**
 * L'editeur de page, sur la page elle-meme.
 *
 * Il rend les VRAIS composants du site public, avec les vraies donnees, dans un
 * cadre d'edition qui vit entierement cote back-office. Le site public ne porte
 * donc aucun code d'edition : un visiteur ne telecharge pas une barre d'outils
 * qu'il ne verra jamais, et une faille de l'editeur n'a aucune surface publique.
 *
 * Il enregistre la page ENTIERE en une fois, la ou l'ecran de formulaire
 * enregistre section par section. Ce n'est pas un raccourci : c'est ce qui
 * permet de deplacer, dupliquer et retirer des sections sans aller-retour, donc
 * d'editer a la vitesse ou l'on pense. Tant qu'on n'a pas enregistre, la base
 * n'a pas bouge.
 */

function pageFrom(param: string) {
	const page = getContentPage(param.toUpperCase());
	if (!page) error(404, 'Page inconnue.');
	return page;
}

/** La ligne de page, creee au premier enregistrement. */
async function ensurePage(key: ContentPageKey, userId: string) {
	return prisma.contentPage.upsert({
		where: { key },
		create: { key, updatedById: userId },
		update: { updatedById: userId }
	});
}

export const load: PageServerLoad = async ({ locals, params }) => {
	// `+page@.svelte` sort du gabarit du back-office : la garde ne peut donc pas
	// reposer sur celui-ci, et le compte ne descend pas non plus par lui. Les
	// deux sont repris ici, explicitement.
	const user = requirePermission(locals.user, 'content.read');

	const page = pageFrom(params.key);
	const key = page.key;

	const [record, library, tokens] = await Promise.all([
		prisma.contentPage.findUnique({
			where: { key },
			select: {
				status: true,
				publishedAt: true,
				updatedAt: true,
				blocks: {
					orderBy: { position: 'asc' },
					select: { id: true, type: true, data: true }
				}
			}
		}),
		listLibrary(),
		contentTokens()
	]);

	return {
		user,
		page,
		status: record?.status ?? null,
		publishedAt: record?.publishedAt ?? null,
		updatedAt: record?.updatedAt ?? null,
		// Une page jamais editee s'ouvre sur son modele d'origine plutot que sur
		// du vide : on part de la page telle qu'elle est en ligne, ce qui est le
		// point de depart qu'on attend en cliquant « Modifier ».
		blocks: record ? describeBlocks(record.blocks) : templateBlocks(key),
		fromTemplate: record === null,
		hasTemplate: getContentTemplate(key) !== null,
		library,
		tokens,
		// Le tirage au sort des portraits n'a pas sa place ici : dans l'editeur,
		// un ordre qui change a chaque frappe donnerait l'impression d'un bogue.
		team: TEAM,
		tokenList: CONTENT_TOKENS,
		blockLibrary: contentBlockLibrary().map((group) => ({
			label: group.label,
			types: group.types.map((type) => ({
				key: type.key,
				label: type.label,
				description: type.description,
				fields: type.fields
			}))
		}))
	};
};

interface StoredBlock {
	readonly id: string;
	readonly type: string;
	readonly data: unknown;
}

function describeBlocks(blocks: readonly StoredBlock[]) {
	return blocks.map((block) => ({
		type: block.type,
		data: (block.data ?? {}) as Record<string, unknown>
	}));
}

/** Le modele d'origine, sous la meme forme qu'une page enregistree. */
function templateBlocks(key: ContentPageKey) {
	const template = getContentTemplate(key);
	if (!template) return [];

	const prepared = prepareTemplate(template);
	if (!prepared.ok) return [];

	return prepared.blocks.map((block) => ({ type: block.type, data: block.data }));
}

interface SubmittedBlock {
	readonly type: string;
	readonly data: Record<string, unknown>;
}

/**
 * Relit la page soumise par l'editeur.
 *
 * Chaque section repasse par la validation de son type : ce qui arrive ici est
 * du JSON forge par un navigateur, et le registre est la seule autorite sur ce
 * qu'un champ accepte. Une section refusee arrete l'enregistrement en nommant
 * son rang — ecrire la page a moitie serait le pire des deux.
 */
function parseDocument(
	raw: string
): { ok: true; blocks: SubmittedBlock[] } | { ok: false; reason: string } {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return { ok: false, reason: 'Document illisible. Rechargez la page et recommencez.' };
	}

	if (!Array.isArray(parsed)) return { ok: false, reason: 'Document illisible.' };

	const blocks: SubmittedBlock[] = [];

	for (const [index, entry] of parsed.entries()) {
		const rank = index + 1;
		if (typeof entry !== 'object' || entry === null) {
			return { ok: false, reason: `Section ${rank} illisible.` };
		}

		const { type, data } = entry as { type?: unknown; data?: unknown };
		if (typeof type !== 'string') return { ok: false, reason: `Section ${rank} sans type.` };

		const definition = getContentBlockType(type);
		if (!definition) {
			return { ok: false, reason: `Section ${rank} : type inconnu (« ${type} »).` };
		}

		const validated = definition.parseData(data);
		if (!validated.ok) {
			return { ok: false, reason: `Section ${rank} (${definition.label}) : ${validated.reason}` };
		}

		blocks.push({ type, data: validated.data });
	}

	return { ok: true, blocks };
}

export const actions: Actions = {
	/**
	 * Enregistre la page entiere.
	 *
	 * Les sections sont remplacees, pas mises a jour une a une : l'editeur peut
	 * en avoir ajoute, retire et deplace, et rapprocher les deux etats ligne par
	 * ligne demanderait de suivre des identifiants que l'editeur n'a pas a
	 * porter. Le remplacement a lieu dans une transaction, donc la page n'existe
	 * jamais a moitie.
	 */
	save: async ({ request, locals, params }) => {
		const user = requirePermission(locals.user, 'content.write');
		const key = pageFrom(params.key).key;

		const form = await request.formData();
		const document = parseDocument(readText(form, 'document'));
		if (!document.ok) return fail(400, { message: document.reason });

		const page = await ensurePage(key, user.id);

		await prisma.$transaction([
			prisma.contentBlock.deleteMany({ where: { pageId: page.id } }),
			prisma.contentBlock.createMany({
				data: document.blocks.map((block, index) => ({
					pageId: page.id,
					type: block.type,
					position: index,
					data: block.data as never
				}))
			})
		]);

		await recordAudit({
			actorId: user.id,
			action: 'content.page.save',
			entity: 'ContentPage',
			entityId: page.id,
			metadata: { key, blocks: document.blocks.length }
		});

		return {
			message: `Page enregistrée : ${document.blocks.length} section${document.blocks.length > 1 ? 's' : ''}.`,
			saved: true
		};
	},

	/**
	 * Enregistre puis publie, en une seule fois.
	 *
	 * Publier ce qui est a l'ecran est le geste qu'on attend du bouton
	 * « Publier ». Publier l'etat enregistre precedemment, en laissant les
	 * modifications visibles a l'ecran hors ligne, serait un piege.
	 */
	publish: async ({ request, locals, params }) => {
		const user = requirePermission(locals.user, 'content.publish');
		const target = pageFrom(params.key);
		const key = target.key;

		const form = await request.formData();
		const document = parseDocument(readText(form, 'document'));
		if (!document.ok) return fail(400, { message: document.reason });

		const page = await ensurePage(key, user.id);

		await prisma.$transaction([
			prisma.contentBlock.deleteMany({ where: { pageId: page.id } }),
			prisma.contentBlock.createMany({
				data: document.blocks.map((block, index) => ({
					pageId: page.id,
					type: block.type,
					position: index,
					data: block.data as never
				}))
			}),
			prisma.contentPage.update({
				where: { id: page.id },
				data: { status: 'PUBLISHED', publishedAt: new Date(), updatedById: user.id }
			})
		]);

		await recordAudit({
			actorId: user.id,
			action: 'content.page.publish',
			entity: 'ContentPage',
			entityId: page.id,
			metadata: { key, blocks: document.blocks.length }
		});

		await notify({
			type: 'content.published',
			entity: 'ContentPage',
			entityId: page.id,
			actorId: user.id,
			data: { key, label: target.label }
		});

		return { message: `« ${target.label} » est en ligne.`, saved: true };
	},

	unpublish: async ({ locals, params }) => {
		const user = requirePermission(locals.user, 'content.publish');
		const target = pageFrom(params.key);

		const page = await prisma.contentPage.findUnique({ where: { key: target.key } });
		if (!page) return fail(404, { message: "Cette page n'a jamais été enregistrée." });

		await prisma.contentPage.update({
			where: { id: page.id },
			data: { status: 'DRAFT', updatedById: user.id }
		});

		await recordAudit({
			actorId: user.id,
			action: 'content.page.unpublish',
			entity: 'ContentPage',
			entityId: page.id,
			metadata: { key: target.key }
		});

		return {
			message: `« ${target.label} » est dépubliée : le site sert de nouveau son modèle d'origine.`
		};
	}
};
