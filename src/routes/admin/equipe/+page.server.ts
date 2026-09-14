import { fail } from '@sveltejs/kit';
import { recordAudit } from '$lib/server/audit';
import {
	destroyAllSessions,
	generateSessionToken,
	hashSessionToken
} from '$lib/server/auth/session';
import { prisma } from '$lib/server/db';
import { readText } from '$lib/server/forms';
import { requirePermission } from '$lib/server/rbac/guard';
import type { Actions, PageServerLoad } from './$types';

/**
 * Gestion de l'equipe.
 *
 * Aucune inscription publique : on rejoint la plateforme par invitation. Le
 * jeton d'invitation suit la meme regle que les sessions — la base n'en garde
 * que l'empreinte, le jeton en clair n'existe qu'une fois, dans le lien remis.
 */

const INVITATION_DAYS = 7;

export const load: PageServerLoad = async ({ locals }) => {
	requirePermission(locals.user, 'user.read');

	const [users, roles, invitations] = await Promise.all([
		prisma.user.findMany({
			orderBy: { createdAt: 'asc' },
			select: {
				id: true,
				email: true,
				displayName: true,
				isActive: true,
				lastLoginAt: true,
				createdAt: true,
				role: { select: { id: true, name: true } }
			}
		}),
		prisma.role.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
		prisma.invitation.findMany({
			where: { acceptedAt: null, expiresAt: { gt: new Date() } },
			orderBy: { createdAt: 'desc' },
			select: { id: true, email: true, expiresAt: true, role: { select: { name: true } } }
		})
	]);

	return { users, roles, invitations };
};

export const actions: Actions = {
	invite: async ({ request, locals, url }) => {
		const user = requirePermission(locals.user, 'user.manage');

		const form = await request.formData();
		const email = readText(form, 'email').toLowerCase();
		const roleId = readText(form, 'roleId');

		if (!email.includes('@')) return fail(400, { message: 'Adresse electronique invalide.' });

		const existing = await prisma.user.findUnique({ where: { email } });
		if (existing) return fail(400, { message: 'Un compte existe deja pour cette adresse.' });

		const role = await prisma.role.findUnique({ where: { id: roleId } });
		if (!role) return fail(400, { message: 'Role inconnu.' });

		const token = generateSessionToken();

		await prisma.invitation.create({
			data: {
				email,
				roleId,
				tokenHash: hashSessionToken(token),
				expiresAt: new Date(Date.now() + INVITATION_DAYS * 24 * 60 * 60 * 1000),
				createdById: user.id
			}
		});

		await recordAudit({
			actorId: user.id,
			action: 'user.invite',
			entity: 'Invitation',
			metadata: { email, role: role.name }
		});

		// Le lien est rendu une seule fois, ici : aucun service d'envoi de courriel
		// n'est configure, et en ajouter un serait une dependance de plus a un
		// tiers. L'administrateur transmet le lien par le canal qu'il juge sur.
		return {
			message: `Invitation creee pour ${email}. Transmettez ce lien, il n'est affiche qu'une fois.`,
			invitationUrl: `${url.origin}/invitation/${token}`
		};
	},

	setRole: async ({ request, locals }) => {
		const user = requirePermission(locals.user, 'user.manage');

		const form = await request.formData();
		const id = readText(form, 'id');
		const roleId = readText(form, 'roleId');

		const target = await prisma.user.findUnique({ where: { id } });
		if (!target) return fail(404, { message: 'Compte introuvable.' });

		await prisma.user.update({ where: { id }, data: { roleId } });
		await recordAudit({
			actorId: user.id,
			action: 'user.setRole',
			entity: 'User',
			entityId: id,
			metadata: { email: target.email }
		});

		return { message: `Role de ${target.displayName} mis a jour.` };
	},

	toggleActive: async ({ request, locals }) => {
		const user = requirePermission(locals.user, 'user.manage');

		const form = await request.formData();
		const id = readText(form, 'id');

		const target = await prisma.user.findUnique({ where: { id } });
		if (!target) return fail(404, { message: 'Compte introuvable.' });

		// Se desactiver soi-meme fermerait la porte de l'interieur.
		if (target.id === user.id) {
			return fail(400, { message: 'Vous ne pouvez pas desactiver votre propre compte.' });
		}

		const isActive = !target.isActive;
		await prisma.user.update({ where: { id }, data: { isActive } });

		// Desactiver coupe les sessions ouvertes tout de suite : attendre leur
		// expiration laisserait l'acces sept jours de plus.
		if (!isActive) await destroyAllSessions(id);

		await recordAudit({
			actorId: user.id,
			action: isActive ? 'user.activate' : 'user.deactivate',
			entity: 'User',
			entityId: id,
			metadata: { email: target.email }
		});

		return { message: `${target.displayName} est ${isActive ? 'reactive' : 'desactive'}.` };
	},

	revokeInvitation: async ({ request, locals }) => {
		const user = requirePermission(locals.user, 'user.manage');

		const form = await request.formData();
		const id = readText(form, 'id');

		await prisma.invitation.delete({ where: { id } }).catch(() => undefined);
		await recordAudit({
			actorId: user.id,
			action: 'user.revokeInvitation',
			entity: 'Invitation',
			entityId: id
		});

		return { message: 'Invitation revoquee.' };
	}
};
