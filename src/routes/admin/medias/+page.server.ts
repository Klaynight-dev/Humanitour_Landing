import { fail, redirect } from '@sveltejs/kit';
import { recordAudit } from '$lib/server/audit';
import { prisma } from '$lib/server/db';
import { readText } from '$lib/server/forms';
import { requirePermission } from '$lib/server/rbac/guard';
import { getMediaType, MEDIA_TYPES } from '$lib/shared/media';
import { toSlug, uniqueSlug } from '$lib/shared/slug';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requirePermission(locals.user, 'media.read');

	const items = await prisma.mediaItem.findMany({
		orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
		select: {
			id: true,
			slug: true,
			kind: true,
			status: true,
			title: true,
			publishedAt: true,
			updatedAt: true,
			author: { select: { displayName: true } }
		}
	});

	return {
		items: items.map((item) => ({
			id: item.id,
			slug: item.slug,
			kind: item.kind,
			kindLabel: getMediaType(item.kind)?.label ?? item.kind,
			status: item.status,
			title: item.title,
			publishedAt: item.publishedAt,
			updatedAt: item.updatedAt,
			author: item.author?.displayName ?? null
		})),
		kinds: MEDIA_TYPES.map((type) => ({
			key: type.key,
			label: type.label,
			description: type.description
		}))
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const user = requirePermission(locals.user, 'media.write');

		const form = await request.formData();
		const title = readText(form, 'title');
		const kind = readText(form, 'kind');

		if (title.length < 3) return fail(400, { message: 'Le titre est obligatoire.' });
		if (!getMediaType(kind)) return fail(400, { message: 'Nature de media inconnue.' });

		const taken = await prisma.mediaItem.findMany({ select: { slug: true } });
		const slug = uniqueSlug(toSlug(title), taken.map((row) => row.slug));

		const item = await prisma.mediaItem.create({
			data: { title, slug, kind: kind as never, authorId: user.id }
		});

		await recordAudit({
			actorId: user.id,
			action: 'media.create',
			entity: 'MediaItem',
			entityId: item.id,
			metadata: { slug, kind }
		});

		redirect(303, `/admin/medias/${item.id}`);
	},

	delete: async ({ request, locals }) => {
		const user = requirePermission(locals.user, 'media.delete');

		const form = await request.formData();
		const id = readText(form, 'id');

		const item = await prisma.mediaItem.findUnique({ where: { id } });
		if (!item) return fail(404, { message: 'Media introuvable.' });

		await prisma.mediaItem.delete({ where: { id } });
		await recordAudit({
			actorId: user.id,
			action: 'media.delete',
			entity: 'MediaItem',
			entityId: id,
			metadata: { slug: item.slug }
		});

		return { message: `« ${item.title} » supprime.` };
	}
};
