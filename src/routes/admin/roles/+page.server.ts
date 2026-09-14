import { fail } from '@sveltejs/kit';
import { recordAudit } from '$lib/server/audit';
import { prisma } from '$lib/server/db';
import { readOptionalText, readPrefixed, readText } from '$lib/server/forms';
import { requirePermission } from '$lib/server/rbac/guard';
import {
	isPermission,
	isSensitive,
	PERMISSIONS,
	permissionsByGroup,
	sanitizePermissions
} from '$lib/shared/permissions';
import { toSlug, uniqueSlug } from '$lib/shared/slug';
import type { Actions, PageServerLoad } from './$types';

/**
 * Gestion des roles.
 *
 * Un role n'est qu'une liste de permissions atomiques. Ajouter un role
 * « Benevole region Sud » ne demande aucun deploiement (CLAUDE.md, decision 17).
 */

export const load: PageServerLoad = async ({ locals }) => {
	requirePermission(locals.user, 'role.manage');

	const roles = await prisma.role.findMany({
		orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
		include: { _count: { select: { users: true } } }
	});

	return {
		roles: roles.map((role) => ({
			id: role.id,
			slug: role.slug,
			name: role.name,
			description: role.description,
			isSystem: role.isSystem,
			userCount: role._count.users,
			permissions: sanitizePermissions(role.permissions)
		})),
		groups: [...permissionsByGroup()].map(([group, keys]) => ({
			group,
			permissions: keys.map((key) => ({
				key,
				label: PERMISSIONS[key].label,
				description: PERMISSIONS[key].description,
				sensitive: isSensitive(key)
			}))
		}))
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const user = requirePermission(locals.user, 'role.manage');

		const form = await request.formData();
		const name = readText(form, 'name');
		if (name.length < 3) return fail(400, { message: 'Le nom du role est obligatoire.' });

		const taken = await prisma.role.findMany({ select: { slug: true } });
		const slug = uniqueSlug(toSlug(name), taken.map((row) => row.slug));

		const role = await prisma.role.create({
			data: { name, slug, description: readOptionalText(form, 'description'), permissions: [] }
		});

		await recordAudit({
			actorId: user.id,
			action: 'role.create',
			entity: 'Role',
			entityId: role.id,
			metadata: { slug }
		});

		return { message: `Role « ${name} » cree. Choisissez ses permissions ci-dessous.` };
	},

	update: async ({ request, locals }) => {
		const user = requirePermission(locals.user, 'role.manage');

		const form = await request.formData();
		const id = readText(form, 'id');

		const role = await prisma.role.findUnique({ where: { id } });
		if (!role) return fail(404, { message: 'Role introuvable.' });

		// Les cases cochees arrivent en « perm:<cle> ». Elles sont filtrees par le
		// registre : une cle inventee dans le formulaire n'accorde rien.
		const requested = Object.keys(readPrefixed(form, 'perm:')).filter(isPermission);

		// Vider un role systeme enfermerait tout le monde dehors : la plateforme
		// n'aurait plus aucun compte capable d'administrer.
		if (role.isSystem && requested.length === 0) {
			return fail(400, {
				message: "Un role systeme ne peut pas etre vide : sans lui, plus personne ne peut administrer."
			});
		}

		await prisma.role.update({
			where: { id },
			data: {
				name: readText(form, 'name') || role.name,
				description: readOptionalText(form, 'description'),
				permissions: requested
			}
		});

		await recordAudit({
			actorId: user.id,
			action: 'role.update',
			entity: 'Role',
			entityId: id,
			metadata: { slug: role.slug, permissions: requested.length }
		});

		return { message: `Role « ${role.name} » mis a jour.` };
	},

	delete: async ({ request, locals }) => {
		const user = requirePermission(locals.user, 'role.manage');

		const form = await request.formData();
		const id = readText(form, 'id');

		const role = await prisma.role.findUnique({
			where: { id },
			include: { _count: { select: { users: true } } }
		});
		if (!role) return fail(404, { message: 'Role introuvable.' });

		if (role.isSystem) {
			return fail(400, { message: 'Un role systeme ne peut pas etre supprime.' });
		}

		// Supprimer un role attribue laisserait des comptes sans role : la cle
		// etrangere l'interdit, autant le dire clairement.
		if (role._count.users > 0) {
			return fail(400, {
				message: `« ${role.name} » est attribue a ${role._count.users} compte(s). Deplacez-les d'abord vers un autre role.`
			});
		}

		await prisma.role.delete({ where: { id } });
		await recordAudit({
			actorId: user.id,
			action: 'role.delete',
			entity: 'Role',
			entityId: id,
			metadata: { slug: role.slug }
		});

		return { message: `Role « ${role.name} » supprime.` };
	}
};
