/**
 * Limitation des tentatives de connexion.
 *
 * Sans frein, un formulaire de connexion se teste au dictionnaire. Le compteur
 * est garde en memoire du processus : c est suffisant pour une instance unique,
 * qui est le deploiement prevu, et c est honnete de le dire plutot que de
 * laisser croire a une protection distribuee. Le jour ou le site tournera sur
 * plusieurs instances, ce module sera le seul a changer.
 *
 * La cle combine l adresse et l identifiant vise : sans l adresse, un attaquant
 * bloquerait n importe quel compte en echouant volontairement ; sans
 * l identifiant, un reseau partage bloquerait ses propres utilisateurs.
 */

export const MAX_ATTEMPTS = 8;
export const WINDOW_MS = 15 * 60 * 1000;

interface Attempt {
	count: number;
	/** Fin de la fenetre courante. */
	resetAt: number;
}

export interface ThrottleState {
	readonly attempts: Map<string, Attempt>;
}

export function createThrottle(): ThrottleState {
	return { attempts: new Map() };
}

export interface ThrottleVerdict {
	readonly blocked: boolean;
	readonly remaining: number;
	/** Secondes avant la prochaine tentative possible. Zero si non bloque. */
	readonly retryAfterSeconds: number;
}

function keyOf(identifier: string, ip: string | null): string {
	return `${identifier.trim().toLowerCase()}\u0000${ip ?? 'sans-ip'}`;
}

/**
 * Consulte l etat SANS le modifier.
 *
 * Separer la consultation de l enregistrement evite le piege classique : une
 * connexion reussie ne doit pas compter comme une tentative.
 */
export function check(
	state: ThrottleState,
	identifier: string,
	ip: string | null,
	now: number = Date.now()
): ThrottleVerdict {
	const entry = state.attempts.get(keyOf(identifier, ip));

	if (!entry || entry.resetAt <= now) {
		return { blocked: false, remaining: MAX_ATTEMPTS, retryAfterSeconds: 0 };
	}

	const remaining = Math.max(0, MAX_ATTEMPTS - entry.count);

	return {
		blocked: remaining === 0,
		remaining,
		retryAfterSeconds: remaining === 0 ? Math.ceil((entry.resetAt - now) / 1000) : 0
	};
}

/** Enregistre un echec et rend le nouvel etat. */
export function recordFailure(
	state: ThrottleState,
	identifier: string,
	ip: string | null,
	now: number = Date.now()
): ThrottleVerdict {
	const key = keyOf(identifier, ip);
	const entry = state.attempts.get(key);

	if (!entry || entry.resetAt <= now) {
		state.attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
		return { blocked: false, remaining: MAX_ATTEMPTS - 1, retryAfterSeconds: 0 };
	}

	entry.count += 1;
	return check(state, identifier, ip, now);
}

/** Efface le compteur apres une connexion reussie. */
export function clear(state: ThrottleState, identifier: string, ip: string | null): void {
	state.attempts.delete(keyOf(identifier, ip));
}

/**
 * Purge les fenetres expirees.
 *
 * Sans elle, la table grossirait indefiniment sous une attaque distribuee : le
 * frein deviendrait lui-meme le probleme.
 */
export function prune(state: ThrottleState, now: number = Date.now()): number {
	let removed = 0;

	for (const [key, entry] of state.attempts) {
		if (entry.resetAt > now) continue;
		state.attempts.delete(key);
		removed += 1;
	}

	return removed;
}

/** Instance partagee par le processus. */
export const loginThrottle = createThrottle();
