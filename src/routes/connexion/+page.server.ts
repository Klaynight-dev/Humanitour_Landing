import { fail, redirect } from '@sveltejs/kit';
import { recordAudit } from '$lib/server/audit';
import { verifyPassword } from '$lib/server/auth/password';
import { createSession, setSessionCookie } from '$lib/server/auth/session';
import { check, clear, loginThrottle, recordFailure } from '$lib/server/auth/throttle';
import { prisma } from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

/**
 * Connexion au back-office.
 *
 * Aucune inscription publique : les comptes sont crees par invitation
 * (CLAUDE.md, decision 15).
 */

/** Destination apres connexion, restreinte aux chemins internes. */
function safeRedirect(target: string | null): string {
	// Un `?suite=https://ailleurs.example` transformerait la page de connexion en
	// tremplin de hameconnage. Seuls les chemins internes sont acceptes.
	if (!target || !target.startsWith('/') || target.startsWith('//')) return '/admin';
	return target;
}

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.user) redirect(303, safeRedirect(url.searchParams.get('suite')));
	return { suite: url.searchParams.get('suite') };
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress, url }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim().toLowerCase();
		const password = String(form.get('password') ?? '');
		const ip = getClientAddress();

		if (!email || !password) {
			return fail(400, { email, message: 'Renseignez votre adresse et votre mot de passe.' });
		}

		const verdict = check(loginThrottle, email, ip);
		if (verdict.blocked) {
			const minutes = Math.ceil(verdict.retryAfterSeconds / 60);
			return fail(429, {
				email,
				message: `Trop de tentatives. Reessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.`
			});
		}

		const user = await prisma.user.findUnique({ where: { email } });
		const valid = user ? await verifyPassword(user.passwordHash, password) : false;

		// Un compte desactive echoue comme un mauvais mot de passe : le message ne
		// doit pas reveler qu'une adresse existe.
		if (!user || !valid || !user.isActive) {
			recordFailure(loginThrottle, email, ip);
			return fail(400, { email, message: 'Adresse ou mot de passe incorrect.' });
		}

		clear(loginThrottle, email, ip);

		const session = await createSession(user.id, {
			userAgent: request.headers.get('user-agent'),
			ip
		});
		setSessionCookie(cookies, session.token, session.expiresAt);

		await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
		await recordAudit({ actorId: user.id, action: 'auth.login', entity: 'User', entityId: user.id });

		redirect(303, safeRedirect(url.searchParams.get('suite')));
	}
};
