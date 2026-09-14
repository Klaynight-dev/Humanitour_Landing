import { error, fail } from '@sveltejs/kit';
import { recordAudit } from '$lib/server/audit';
import { prisma } from '$lib/server/db';
import { readDate, readOptionalText, readText } from '$lib/server/forms';
import { requirePermission } from '$lib/server/rbac/guard';
import { allowedProviders, requireMediaType } from '$lib/shared/media';
import type { Actions, PageServerLoad } from './$types';

/**
 * Editeur d'un media.
 *
 * Les champs propres a la nature viennent du REGISTRE : ajouter un type de
 * media n'ajoute rien ici, ni colonne en base, ni champ code en dur.
 */

export const load: PageServerLoad = async ({ params, locals }) => {
	requirePermission(locals.user, 'media.read');

	const item = await prisma.mediaItem.findUnique({
		where: { id: params.id },
		include: { author: { select: { displayName: true } } }
	});

	if (!item) error(404, { message: 'Media introuvable.' });

	const type = requireMediaType(item.kind);
	const data = (item.data ?? {}) as Record<string, unknown>;

	return {
		item: {
			id: item.id,
			slug: item.slug,
			kind: item.kind,
			status: item.status,
			title: item.title,
			excerpt: item.excerpt,
			body: item.body,
			coverUrl: item.coverUrl,
			coverAlt: item.coverAlt,
			publishedAt: item.publishedAt,
			tags: item.tags.join(', '),
			author: item.author?.displayName ?? null
		},
		type: {
			key: type.key,
			label: type.label,
			description: type.description,
			hasBody: type.hasBody,
			fields: type.fields.map((field) => ({
				...field,
				value: data[field.name] === undefined ? '' : String(data[field.name])
			}))
		},
		providers: allowedProviders()
	};
};

export const actions: Actions = {
	save: async ({ request, params, locals }) => {
		const user = requirePermission(locals.user, 'media.write');
		const form = await request.formData();

		const item = await prisma.mediaItem.findUnique({ where: { id: params.id } });
		if (!item) return fail(404, { message: 'Media introuvable.' });

		const title = readText(form, 'title');
		if (title.length < 3) return fail(400, { message: 'Le titre est obligatoire.' });

		const type = requireMediaType(item.kind);

		// Les champs propres a la nature sont lus depuis sa declaration, pas depuis
		// une liste ecrite ici : c'est le registre qui sait ce qu'attend un podcast.
		const raw: Record<string, unknown> = {};
		for (const field of type.fields) {
			const value = readText(form, `data.${field.name}`);
			if (value !== '') raw[field.name] = value;
		}

		const parsed = type.parseData(raw);
		if (!parsed.ok) return fail(400, { message: parsed.reason });

		await prisma.mediaItem.update({
			where: { id: params.id },
			data: {
				title,
				excerpt: readOptionalText(form, 'excerpt'),
				body: type.hasBody ? readOptionalText(form, 'body') : null,
				coverUrl: readOptionalText(form, 'coverUrl'),
				coverAlt: readOptionalText(form, 'coverAlt'),
				publishedAt: readDate(form, 'publishedAt'),
				tags: readText(form, 'tags')
					.split(',')
					.map((tag) => tag.trim())
					.filter((tag) => tag !== ''),
				data: parsed.data as never
			}
		});

		await recordAudit({
			actorId: user.id,
			action: 'media.update',
			entity: 'MediaItem',
			entityId: params.id,
			metadata: { slug: item.slug }
		});

		return { message: 'Media enregistre.' };
	},

	publish: async ({ request, params, locals }) => {
		const user = requirePermission(locals.user, 'media.publish');
		const form = await request.formData();

		const item = await prisma.mediaItem.findUnique({ where: { id: params.id } });
		if (!item) return fail(404, { message: 'Media introuvable.' });

		const type = requireMediaType(item.kind);
		const parsed = type.parseData((item.data ?? {}) as Record<string, unknown>);

		// Un media dont les champs propres sont incomplets ne part pas en ligne :
		// une video sans adresse d'integration afficherait un cadre vide.
		if (!parsed.ok) {
			return fail(400, { message: `Impossible de publier : ${parsed.reason}` });
		}

		const requested = readDate(form, 'publishedAt');
		const publishedAt = requested ?? item.publishedAt ?? new Date();

		// Une date future vaut programmation : le media apparaitra de lui-meme a
		// l'heure dite, sans tache planifiee.
		const status = publishedAt.getTime() > Date.now() ? 'SCHEDULED' : 'PUBLISHED';

		await prisma.mediaItem.update({ where: { id: params.id }, data: { status, publishedAt } });

		await recordAudit({
			actorId: user.id,
			action: 'media.publish',
			entity: 'MediaItem',
			entityId: params.id,
			metadata: { slug: item.slug, status }
		});

		return {
			message:
				status === 'SCHEDULED'
					? 'Publication programmee. Le media apparaitra a la date indiquee.'
					: 'Media publie.'
		};
	},

	unpublish: async ({ params, locals }) => {
		const user = requirePermission(locals.user, 'media.publish');

		await prisma.mediaItem.update({ where: { id: params.id }, data: { status: 'DRAFT' } });
		await recordAudit({
			actorId: user.id,
			action: 'media.unpublish',
			entity: 'MediaItem',
			entityId: params.id
		});

		return { message: 'Media repasse en brouillon.' };
	}
};
