import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { sanitizePermissions, type Permission } from '$lib/shared/permissions';
import { prisma } from '../db';

/**
 * Sessions.
 *
 * Le jeton en clair n existe que dans le cookie du navigateur. La base ne stocke
 * que son empreinte SHA-256 : une fuite de la table `Session` ne permet pas
 * d usurper une session en cours.
 *
 * SHA-256 sans sel ni etirement est ici le bon choix, contrairement aux mots de
 * passe : le jeton fait 256 bits d entropie tiree du generateur cryptographique,
 * il n y a rien a deviner par force brute.
 */

export const SESSION_COOKIE = 'humanitour_session';

/** Sept jours, la duree annoncee dans la politique de confidentialite. */
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/** Au-dela de la moitie de sa vie, une session active est prolongee. */
const RENEW_AFTER_MS = SESSION_DURATION_MS / 2;

export interface SessionUser {
	readonly id: string;
	readonly email: string;
	readonly displayName: string;
	readonly role: { readonly id: string; readonly slug: string; readonly name: string };
	readonly permissions: readonly Permission[];
}

export function generateSessionToken(): string {
	return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

/**
 * Comparaison a temps constant de deux empreintes.
 *
 * Utilisee pour les jetons d invitation, ou l appelant compare lui-meme deux
 * valeurs. Une comparaison naive fuirait le prefixe correct par le temps de
 * reponse.
 */
export function safeCompare(a: string, b: string): boolean {
	const left = Buffer.from(a, 'utf8');
	const right = Buffer.from(b, 'utf8');
	if (left.length !== right.length) return false;
	return timingSafeEqual(left, right);
}

/** Empreinte de l adresse IP : suffisante pour reconnaitre un appareil, non reversible. */
export function hashIp(ip: string | null): string | null {
	if (!ip) return null;
	return createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

export async function createSession(
	userId: string,
	context: { userAgent?: string | null; ip?: string | null } = {}
): Promise<{ token: string; expiresAt: Date }> {
	const token = generateSessionToken();
	const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

	await prisma.session.create({
		data: {
			id: hashSessionToken(token),
			userId,
			expiresAt,
			userAgent: context.userAgent?.slice(0, 255) ?? null,
			ipHash: hashIp(context.ip ?? null)
		}
	});

	return { token, expiresAt };
}

/**
 * Resout un jeton en utilisateur.
 *
 * Retourne `null` pour un jeton inconnu, expire, ou appartenant a un compte
 * desactive. Une session expiree est supprimee au passage : la table se purge
 * d elle-meme au fil des visites.
 */
export async function validateSession(token: string | undefined): Promise<SessionUser | null> {
	if (!token) return null;

	const id = hashSessionToken(token);
	const session = await prisma.session.findUnique({
		where: { id },
		include: { user: { include: { role: true } } }
	});

	if (!session) return null;

	if (session.expiresAt.getTime() <= Date.now()) {
		await prisma.session.delete({ where: { id } }).catch(() => undefined);
		return null;
	}

	// Desactiver un compte doit couper ses sessions immediatement, sans attendre
	// leur expiration.
	if (!session.user.isActive) return null;

	await touchSession(session.id, session.expiresAt);

	return {
		id: session.user.id,
		email: session.user.email,
		displayName: session.user.displayName,
		role: {
			id: session.user.role.id,
			slug: session.user.role.slug,
			name: session.user.role.name
		},
		permissions: sanitizePermissions(session.user.role.permissions)
	};
}

/**
 * Prolonge une session encore active.
 *
 * On n ecrit qu au-dela de la moitie de la duree de vie : sans cela, chaque
 * navigation declencherait une ecriture en base.
 */
async function touchSession(id: string, expiresAt: Date): Promise<void> {
	const remaining = expiresAt.getTime() - Date.now();
	if (remaining > RENEW_AFTER_MS) return;

	await prisma.session
		.update({
			where: { id },
			data: { expiresAt: new Date(Date.now() + SESSION_DURATION_MS), lastSeenAt: new Date() }
		})
		.catch(() => undefined);
}

export async function destroySession(token: string | undefined): Promise<void> {
	if (!token) return;
	await prisma.session.delete({ where: { id: hashSessionToken(token) } }).catch(() => undefined);
}

/** Ferme toutes les sessions d un compte : changement de mot de passe, desactivation. */
export async function destroyAllSessions(userId: string): Promise<void> {
	await prisma.session.deleteMany({ where: { userId } });
}

export function setSessionCookie(cookies: Cookies, token: string, expiresAt: Date): void {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		// `secure` est desactive en developpement, ou le site est servi en clair
		// sur localhost.
		secure: process.env.NODE_ENV === 'production',
		expires: expiresAt
	});
}

export function clearSessionCookie(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
