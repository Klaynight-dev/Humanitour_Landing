import { error, fail, redirect } from '@sveltejs/kit';
import { recordAudit } from '$lib/server/audit';
import { checkPasswordStrength, hashPassword } from '$lib/server/auth/password';
import {
	createSession,
	hashSessionToken,
	setSessionCookie
} from '$lib/server/auth/session';
import { prisma } from '$lib/server/db';
import { readText } from '$lib/server/forms';
import type { Actions, PageServerLoad } from './$types';

/**
 * Acceptation d'une invitation.
 *
 * C'est le seul chemin de creation de compte. Le jeton n'est jamais compare en
 * clair : on en calcule l'empreinte et on cherche celle-ci, comme pour les
 * sessions.
 */
async function findInvitation(token: string) {
	return prisma.invitation.findUnique({
		where: { tokenHash: hashSessionToken(token) },
		include: { role: { select: { name: true } } }
	});
}

export const load: PageServerLoad = async ({ params }) => {
	const invitation = await findInvitation(params.token);

	// Meme message pour un jeton inconnu, expire ou deja utilise : distinguer les
	// cas dirait a un visiteur qu'une adresse a bien ete invitee.
	if (!invitation || invitation.acceptedAt || invitation.expiresAt.getTime() <= Date.now()) {
		error(404, { message: "Cette invitation n'est plus valable." });
	}

	return { email: invitation.email, roleName: invitation.role.name };
};

export const actions: Actions = {
	default: async ({ request, params, cookies, getClientAddress }) => {
		const invitation = await findInvitation(params.token);

		if (!invitation || invitation.acceptedAt || invitation.expiresAt.getTime() <= Date.now()) {
			return fail(400, { message: "Cette invitation n'est plus valable." });
		}

		const form = await request.formData();
		const displayName = readText(form, 'displayName');
		const password = String(form.get('password') ?? '');

		if (displayName.length < 2) {
			return fail(400, { message: 'Indiquez le nom sous lequel vous apparaitrez.' });
		}

		const strength = checkPasswordStrength(password);
		if (!strength.ok) return fail(400, { message: strength.reason });

		if (password !== String(form.get('passwordConfirm') ?? '')) {
			return fail(400, { message: 'Les deux mots de passe ne correspondent pas.' });
		}

		const existing = await prisma.user.findUnique({ where: { email: invitation.email } });
		if (existing) return fail(400, { message: 'Un compte existe deja pour cette adresse.' });

		// Creation et consommation de l'invitation dans la meme transaction : sans
		// cela, deux ouvertures simultanees du lien creeraient deux comptes.
		const [user] = await prisma.$transaction([
			prisma.user.create({
				data: {
					email: invitation.email,
					displayName,
					passwordHash: await hashPassword(password),
					roleId: invitation.roleId
				}
			}),
			prisma.invitation.update({
				where: { id: invitation.id },
				data: { acceptedAt: new Date() }
			})
		]);

		const session = await createSession(user.id, {
			userAgent: request.headers.get('user-agent'),
			ip: getClientAddress()
		});
		setSessionCookie(cookies, session.token, session.expiresAt);

		await recordAudit({
			actorId: user.id,
			action: 'user.acceptInvitation',
			entity: 'User',
			entityId: user.id,
			metadata: { email: user.email }
		});

		redirect(303, '/admin');
	}
};
