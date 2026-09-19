import { error, fail } from '@sveltejs/kit';
import { recordAudit } from '$lib/server/audit';
import { notify } from '$lib/server/notifications/emit';
import { prisma } from '$lib/server/db';
import { readText } from '$lib/server/forms';
import { requirePermission } from '$lib/server/rbac/guard';
import {
	CONTENT_BLOCK_TYPES,
	getContentBlockType,
	getContentPage,
	type ContentPageKey
} from '$lib/shared/content';
import type { Actions, PageServerLoad } from './$types';

/** L adresse porte la cle en minuscules ; la base la stocke en enum. */
function pageFrom(param: string) {
	const page = getContentPage(param.toUpperCase());
	if (!page) error(404, 'Page inconnue.');
	return page;
}

function pageKeyFrom(param: string): ContentPageKey {
	return pageFrom(param).key;
}

/**
 * La ligne de page, creee au premier enregistrement.
 *
 * Une page jamais editee n a pas de ligne : c est ce qui permet au site de
 * continuer a servir son contenu d origine sans qu aucune valeur par defaut
 * n ait ete recopiee en base.
 */
async function ensurePage(key: ContentPageKey, userId: string) {
	return prisma.contentPage.upsert({
		where: { key },
		create: { key, updatedById: userId },
		update: { updatedById: userId }
	});
}

/** Lit les champs `data.<nom>` du formulaire pour un type de bloc donne. */
function readData(form: FormData, typeKey: string) {
	const type = getContentBlockType(typeKey);
	if (!type) return { ok: false as const, reason: `Type de bloc inconnu : « ${typeKey} ».` };

	const raw: Record<string, unknown> = {};
	for (const field of type.fields) {
		raw[field.name] = readText(form, `data.${field.name}`);
	}

	const parsed = type.parseData(raw);
	if (!parsed.ok) return { ok: false as const, reason: parsed.reason };
	return { ok: true as const, data: parsed.data };
}

/**
 * Un bloc tel que l editeur l affiche.
 *
 * Un bloc dont le type a disparu du registre reste lisible et supprimable :
 * desinstaller un type de bloc ne doit pas rendre la page inaccessible.
 */
function describeBlock(block: { id: string; type: string; position: number; data: unknown }) {
	const type = getContentBlockType(block.type);

	return {
		id: block.id,
		type: block.type,
		typeLabel: type?.label ?? block.type,
		fields: type?.fields ?? [],
		position: block.position,
		data: (block.data ?? {}) as Record<string, unknown>
	};
}

export const load: PageServerLoad = async ({ locals, params }) => {
	requirePermission(locals.user, 'content.read');

	const page = pageFrom(params.key);
	const key = page.key;

	const record = await prisma.contentPage.findUnique({
		where: { key },
		select: {
			id: true,
			status: true,
			publishedAt: true,
			updatedAt: true,
			updatedBy: { select: { displayName: true } },
			blocks: {
				orderBy: { position: 'asc' },
				select: { id: true, type: true, position: true, data: true }
			}
		}
	});

	// Une page jamais editee n'a pas de ligne en base : tous les champs de suivi
	// sont alors vides, et la page publique sert son contenu d'origine.
	const state = record ?? {
		status: null,
		publishedAt: null,
		updatedAt: null,
		updatedBy: null,
		blocks: []
	};

	return {
		page,
		status: state.status,
		publishedAt: state.publishedAt,
		updatedAt: state.updatedAt,
		updatedBy: state.updatedBy?.displayName ?? null,
		blocks: state.blocks.map(describeBlock),
		blockTypes: CONTENT_BLOCK_TYPES.map((type) => ({
			key: type.key,
			label: type.label,
			description: type.description
		}))
	};
};

export const actions: Actions = {
	addBlock: async ({ request, locals, params }) => {
		const user = requirePermission(locals.user, 'content.write');
		const key = pageKeyFrom(params.key);

		const form = await request.formData();
		const type = readText(form, 'type');
		if (!getContentBlockType(type)) return fail(400, { message: 'Type de bloc inconnu.' });

		const page = await ensurePage(key, user.id);
		const last = await prisma.contentBlock.findFirst({
			where: { pageId: page.id },
			orderBy: { position: 'desc' },
			select: { position: true }
		});

		await prisma.contentBlock.create({
			data: { pageId: page.id, type, position: (last?.position ?? 0) + 1, data: {} }
		});

		await recordAudit({
			actorId: user.id,
			action: 'content.block.add',
			entity: 'ContentPage',
			entityId: page.id,
			metadata: { key, type }
		});

		return { message: 'Bloc ajouté. Renseignez ses champs puis enregistrez.' };
	},

	saveBlock: async ({ request, locals, params }) => {
		const user = requirePermission(locals.user, 'content.write');
		const key = pageKeyFrom(params.key);

		const form = await request.formData();
		const id = readText(form, 'id');

		const block = await prisma.contentBlock.findUnique({
			where: { id },
			select: { id: true, type: true, page: { select: { key: true } } }
		});
		if (!block || block.page.key !== key) return fail(404, { message: 'Bloc introuvable.' });

		const parsed = readData(form, block.type);
		if (!parsed.ok) return fail(400, { message: parsed.reason });

		await prisma.contentBlock.update({ where: { id }, data: { data: parsed.data as never } });
		await prisma.contentPage.update({ where: { key }, data: { updatedById: user.id } });

		await recordAudit({
			actorId: user.id,
			action: 'content.block.update',
			entity: 'ContentBlock',
			entityId: id,
			metadata: { key, type: block.type }
		});

		return { message: 'Bloc enregistré.' };
	},

	moveBlock: async ({ request, locals, params }) => {
		const user = requirePermission(locals.user, 'content.write');
		const key = pageKeyFrom(params.key);

		const form = await request.formData();
		const id = readText(form, 'id');
		const direction = readText(form, 'direction');

		const block = await prisma.contentBlock.findUnique({
			where: { id },
			select: { id: true, position: true, pageId: true, page: { select: { key: true } } }
		});
		if (!block || block.page.key !== key) return fail(404, { message: 'Bloc introuvable.' });

		const neighbour = await prisma.contentBlock.findFirst({
			where: {
				pageId: block.pageId,
				position: direction === 'up' ? { lt: block.position } : { gt: block.position }
			},
			orderBy: { position: direction === 'up' ? 'desc' : 'asc' },
			select: { id: true, position: true }
		});
		// Deja en bout de liste : il n y a rien a echanger, et ce n est pas une erreur.
		if (!neighbour) return { message: 'Le bloc est déjà à cette extrémité.' };

		await prisma.$transaction([
			prisma.contentBlock.update({ where: { id: block.id }, data: { position: neighbour.position } }),
			prisma.contentBlock.update({ where: { id: neighbour.id }, data: { position: block.position } })
		]);

		await recordAudit({
			actorId: user.id,
			action: 'content.block.move',
			entity: 'ContentBlock',
			entityId: id,
			metadata: { key, direction }
		});

		return { message: 'Ordre mis à jour.' };
	},

	deleteBlock: async ({ request, locals, params }) => {
		const user = requirePermission(locals.user, 'content.write');
		const key = pageKeyFrom(params.key);

		const form = await request.formData();
		const id = readText(form, 'id');

		const block = await prisma.contentBlock.findUnique({
			where: { id },
			select: { id: true, type: true, page: { select: { key: true } } }
		});
		if (!block || block.page.key !== key) return fail(404, { message: 'Bloc introuvable.' });

		await prisma.contentBlock.delete({ where: { id } });
		await recordAudit({
			actorId: user.id,
			action: 'content.block.delete',
			entity: 'ContentBlock',
			entityId: id,
			metadata: { key, type: block.type }
		});

		return { message: 'Bloc supprimé.' };
	},

	publish: async ({ locals, params }) => {
		const user = requirePermission(locals.user, 'content.publish');
		const target = pageFrom(params.key);
		const key = target.key;

		const page = await prisma.contentPage.findUnique({
			where: { key },
			select: { id: true, _count: { select: { blocks: true } } }
		});
		// Publier une page vide remplacerait le contenu du site par du blanc.
		if (!page || page._count.blocks === 0) {
			return fail(400, { message: 'Ajoutez au moins un bloc avant de publier cette page.' });
		}

		await prisma.contentPage.update({
			where: { key },
			data: { status: 'PUBLISHED', publishedAt: new Date(), updatedById: user.id }
		});

		await recordAudit({
			actorId: user.id,
			action: 'content.publish',
			entity: 'ContentPage',
			entityId: page.id,
			metadata: { key }
		});

		await notify({
			type: 'content.published',
			entity: 'ContentPage',
			entityId: page.id,
			actorId: user.id,
			data: { key, label: target.label }
		});

		return { message: 'Page publiée : le site affiche désormais cette version.' };
	},

	unpublish: async ({ locals, params }) => {
		const user = requirePermission(locals.user, 'content.publish');
		const key = pageKeyFrom(params.key);

		const page = await prisma.contentPage.findUnique({ where: { key }, select: { id: true } });
		if (!page) return fail(404, { message: 'Page introuvable.' });

		await prisma.contentPage.update({
			where: { key },
			data: { status: 'DRAFT', updatedById: user.id }
		});

		await recordAudit({
			actorId: user.id,
			action: 'content.unpublish',
			entity: 'ContentPage',
			entityId: page.id,
			metadata: { key }
		});

		return { message: "Page dépubliée : le site réaffiche son contenu d'origine." };
	}
};
