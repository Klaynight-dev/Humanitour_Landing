import { error, fail } from '@sveltejs/kit';
import { recordAudit } from '$lib/server/audit';
import { readNested } from '$lib/server/content/form';
import { listLibrary, uploadImage } from '$lib/server/content/images';
import { notify } from '$lib/server/notifications/emit';
import { prisma } from '$lib/server/db';
import { readText } from '$lib/server/forms';
import { requirePermission } from '$lib/server/rbac/guard';
import {
	contentBlockLibrary,
	getContentBlockType,
	getContentPage,
	type ContentPageKey
} from '$lib/shared/content';
import { getContentTemplate, prepareTemplate } from '$lib/shared/content/templates';
import { CONTENT_TOKENS } from '$lib/shared/content/tokens';
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
 * Une page jamais editee n'a pas de ligne : le site sert alors son modele
 * d'origine, celui du depot.
 */
async function ensurePage(key: ContentPageKey, userId: string) {
	return prisma.contentPage.upsert({
		where: { key },
		create: { key, updatedById: userId },
		update: { updatedById: userId }
	});
}

/** Lit et valide les champs d'une section depuis le formulaire. */
function readData(form: FormData, typeKey: string) {
	const type = getContentBlockType(typeKey);
	if (!type) return { ok: false as const, reason: `Type de section inconnu : « ${typeKey} ».` };

	const parsed = type.parseData(readNested(form, 'data'));
	if (!parsed.ok) return { ok: false as const, reason: parsed.reason };
	return { ok: true as const, data: parsed.data };
}

/**
 * Une section telle que l'editeur l'affiche.
 *
 * Une section dont le type a disparu du registre reste lisible et supprimable :
 * retirer un type ne doit pas rendre la page inaccessible.
 */
function describeBlock(block: { id: string; type: string; position: number; data: unknown }) {
	const type = getContentBlockType(block.type);

	return {
		id: block.id,
		type: block.type,
		typeLabel: type?.label ?? block.type,
		description: type?.description ?? null,
		fields: type?.fields ?? [],
		position: block.position,
		data: (block.data ?? {}) as Record<string, unknown>
	};
}

export const load: PageServerLoad = async ({ locals, params }) => {
	requirePermission(locals.user, 'content.read');

	const page = pageFrom(params.key);
	const key = page.key;

	const [record, library] = await Promise.all([
		prisma.contentPage.findUnique({
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
		}),
		listLibrary()
	]);

	// Une page jamais editee n'a pas de ligne : tous les champs de suivi sont
	// alors vides, et le site sert le modele d'origine.
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
		library,
		tokens: CONTENT_TOKENS,
		hasTemplate: getContentTemplate(key) !== null,
		blockLibrary: contentBlockLibrary().map((group) => ({
			label: group.label,
			types: group.types.map((type) => ({
				key: type.key,
				label: type.label,
				description: type.description
			}))
		}))
	};
};

export const actions: Actions = {
	/**
	 * Ajoute une section, deja remplie d'un exemple juste.
	 *
	 * Une section vide obligerait a enregistrer avant de voir quoi que ce soit,
	 * et une page passerait par un etat casse entre l'ajout et la saisie.
	 */
	addBlock: async ({ request, locals, params }) => {
		const user = requirePermission(locals.user, 'content.write');
		const key = pageKeyFrom(params.key);

		const form = await request.formData();
		const typeKey = readText(form, 'type');
		const type = getContentBlockType(typeKey);
		if (!type) return fail(400, { message: 'Type de section inconnu.' });

		const starter = type.parseData(type.starter);
		if (!starter.ok) return fail(500, { message: `Exemple de section invalide : ${starter.reason}` });

		const page = await ensurePage(key, user.id);
		const after = readText(form, 'after');

		const position = await positionAfter(page.id, after);

		await prisma.contentBlock.create({
			data: { pageId: page.id, type: typeKey, position, data: starter.data as never }
		});

		await recordAudit({
			actorId: user.id,
			action: 'content.block.add',
			entity: 'ContentPage',
			entityId: page.id,
			metadata: { key, type: typeKey }
		});

		return { message: `Section « ${type.label} » ajoutée. Modifiez son contenu puis enregistrez.` };
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
		if (!block || block.page.key !== key) return fail(404, { message: 'Section introuvable.' });

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

		return { message: 'Section enregistrée.' };
	},

	/**
	 * Duplique une section, juste apres l'originale.
	 *
	 * C'est la facon la plus rapide d'ajouter une section semblable a une autre :
	 * on copie celle qui va bien et on change deux mots, au lieu de tout resaisir.
	 */
	duplicateBlock: async ({ request, locals, params }) => {
		const user = requirePermission(locals.user, 'content.write');
		const key = pageKeyFrom(params.key);

		const form = await request.formData();
		const id = readText(form, 'id');

		const block = await prisma.contentBlock.findUnique({
			where: { id },
			select: { id: true, type: true, data: true, position: true, pageId: true, page: { select: { key: true } } }
		});
		if (!block || block.page.key !== key) return fail(404, { message: 'Section introuvable.' });

		await prisma.$transaction([
			// Les rangs suivants reculent d'un cran pour laisser la place, plutot
			// que de renumeroter la page entiere.
			prisma.contentBlock.updateMany({
				where: { pageId: block.pageId, position: { gt: block.position } },
				data: { position: { increment: 1 } }
			}),
			prisma.contentBlock.create({
				data: {
					pageId: block.pageId,
					type: block.type,
					position: block.position + 1,
					data: (block.data ?? {}) as never
				}
			})
		]);

		await recordAudit({
			actorId: user.id,
			action: 'content.block.duplicate',
			entity: 'ContentBlock',
			entityId: id,
			metadata: { key, type: block.type }
		});

		return { message: 'Section dupliquée.' };
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
		if (!block || block.page.key !== key) return fail(404, { message: 'Section introuvable.' });

		const neighbour = await prisma.contentBlock.findFirst({
			where: {
				pageId: block.pageId,
				position: direction === 'up' ? { lt: block.position } : { gt: block.position }
			},
			orderBy: { position: direction === 'up' ? 'desc' : 'asc' },
			select: { id: true, position: true }
		});
		// Deja en bout de liste : il n'y a rien a echanger, et ce n'est pas une erreur.
		if (!neighbour) return { message: 'La section est déjà à cette extrémité.' };

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
		if (!block || block.page.key !== key) return fail(404, { message: 'Section introuvable.' });

		await prisma.contentBlock.delete({ where: { id } });
		await recordAudit({
			actorId: user.id,
			action: 'content.block.delete',
			entity: 'ContentBlock',
			entityId: id,
			metadata: { key, type: block.type }
		});

		return { message: 'Section supprimée.' };
	},

	/**
	 * Depose une image et rend son adresse.
	 *
	 * Action a part, et non un champ du formulaire de section : une image
	 * deposee doit etre visible tout de suite, avant l'enregistrement, pour
	 * qu'on voie ce qu'on a choisi. La section, elle, n'enregistre qu'une
	 * adresse et une description.
	 */
	uploadImage: async ({ request, locals }) => {
		requirePermission(locals.user, 'content.write');

		const form = await request.formData();
		const file = form.get('fichier');
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { message: 'Choisissez un fichier image.' });
		}

		const result = await uploadImage(file);
		if (!result.ok) return fail(400, { message: result.reason });

		return { message: 'Image téléversée.', uploaded: result.image };
	},

	publish: async ({ locals, params }) => {
		const user = requirePermission(locals.user, 'content.publish');
		const target = pageFrom(params.key);
		const key = target.key;

		const page = await prisma.contentPage.findUnique({
			where: { key },
			select: { id: true, _count: { select: { blocks: true } } }
		});
		if (!page) return fail(400, { message: 'Ajoutez au moins une section avant de publier.' });

		await prisma.contentPage.update({
			where: { key },
			data: { status: 'PUBLISHED', publishedAt: new Date(), updatedById: user.id }
		});

		await recordAudit({
			actorId: user.id,
			action: 'content.publish',
			entity: 'ContentPage',
			entityId: page.id,
			metadata: { key, blocks: page._count.blocks }
		});

		await notify({
			type: 'content.published',
			entity: 'ContentPage',
			entityId: page.id,
			actorId: user.id,
			data: { key, label: target.label }
		});

		// Publier une page sans section est un choix possible — on le dit, on ne
		// l'empeche pas : une page peut avoir ete videe a dessein.
		return {
			message:
				page._count.blocks === 0
					? 'Page publiée, mais elle ne contient aucune section : le site affiche son modèle d’origine.'
					: 'Page publiée : le site affiche désormais cette version.'
		};
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

		return { message: "Page dépubliée : le site réaffiche son modèle d'origine." };
	},

	/**
	 * Reapplique le modele d'origine de la page.
	 *
	 * C'est le filet de l'edition libre : la base est la source de ce que le
	 * site affiche, on peut donc tout y casser — et remettre la page telle
	 * qu'elle a ete composee tient en un geste. Le modele vient du depot, il ne
	 * peut pas avoir ete abime depuis le back-office.
	 *
	 * Il REMPLACE les sections existantes, il ne s'y ajoute pas : « remettre
	 * d'aplomb » ne veut pas dire « empiler une seconde page sous la premiere ».
	 */
	applyTemplate: async ({ locals, params }) => {
		const user = requirePermission(locals.user, 'content.write');
		const target = pageFrom(params.key);
		const key = target.key;

		const template = getContentTemplate(key);
		if (!template) return fail(404, { message: 'Cette page n’a pas de modèle.' });

		const prepared = prepareTemplate(template);
		// Un modele qui ne passe pas sa propre validation est un bogue du depot,
		// pas une faute de saisie : on le dit tel quel plutot que d'ecrire a
		// moitie la page.
		if (!prepared.ok) return fail(500, { message: prepared.reason });

		const page = await ensurePage(key, user.id);

		await prisma.$transaction([
			prisma.contentBlock.deleteMany({ where: { pageId: page.id } }),
			prisma.contentBlock.createMany({
				data: prepared.blocks.map((block, index) => ({
					pageId: page.id,
					type: block.type,
					position: index,
					data: block.data as never
				}))
			})
		]);

		await recordAudit({
			actorId: user.id,
			action: 'content.template.apply',
			entity: 'ContentPage',
			entityId: page.id,
			metadata: { key, blocks: prepared.blocks.length }
		});

		return {
			message: `Modèle d'origine réappliqué : ${prepared.blocks.length} sections. Publiez pour le mettre en ligne.`
		};
	}
};

/**
 * Le rang d'une nouvelle section.
 *
 * Ajoutee depuis le bouton d'une section, elle se pose juste apres elle : on
 * ajoute une section la ou on la veut, pas en bas d'une page de neuf sections
 * qu'il faudrait ensuite remonter case par case.
 */
async function positionAfter(pageId: string, afterId: string): Promise<number> {
	if (afterId !== '') {
		const previous = await prisma.contentBlock.findUnique({
			where: { id: afterId },
			select: { position: true, pageId: true }
		});

		if (previous && previous.pageId === pageId) {
			await prisma.contentBlock.updateMany({
				where: { pageId, position: { gt: previous.position } },
				data: { position: { increment: 1 } }
			});
			return previous.position + 1;
		}
	}

	const last = await prisma.contentBlock.findFirst({
		where: { pageId },
		orderBy: { position: 'desc' },
		select: { position: true }
	});

	return (last?.position ?? -1) + 1;
}
