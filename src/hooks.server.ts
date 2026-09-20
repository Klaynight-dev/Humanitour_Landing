import type { Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, validateSession } from '$lib/server/auth/session';
import { startSyncSchedule } from '$lib/server/openforms/schedule';

/*
 * Au chargement du module, donc une fois par processus serveur.
 *
 * SvelteKit n'offre pas de crochet de demarrage : ce fichier est le seul point
 * garanti d'etre evalue une fois, avant la premiere requete. La fonction est
 * elle-meme idempotente, ce qui la rend sans danger si le rechargement a chaud
 * du developpement reevalue le module.
 */
startSyncSchedule();

/**
 * Resout la session a chaque requete et la depose dans `locals`.
 *
 * C est le seul endroit qui lit le cookie de session : les routes lisent
 * `locals.user`, jamais le cookie.
 */
export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = await resolveUser(event.cookies.get(SESSION_COOKIE));

	const response = await resolve(event);

	// En-tetes de securite. Pas de CSP ici : elle est definie dans la
	// configuration du serveur, ou elle peut evoluer sans redeploiement.
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('X-Frame-Options', 'DENY');

	return response;
};

/**
 * Resout la session en tolerant une base injoignable.
 *
 * La lecture de session est la SEULE requete que font les pages d argument du
 * site public (accueil, le tour, a propos) : elles n affichent aucune donnee
 * stockee. Laisser remonter l erreur transformait donc une base indisponible en
 * 500 sur la TOTALITE du site, pages statiques comprises.
 *
 * On degrade en visiteur anonyme. C est sans risque : echouer ici n accorde
 * aucun droit, il en retire. Les routes d administration redirigent alors vers
 * la connexion au lieu de rendre une erreur, et la connexion echouera a son
 * tour, ce qui est le comportement attendu quand la base est en panne.
 *
 * L erreur est journalisee et non avalee : une base injoignable reste un
 * incident, elle ne doit simplement pas emporter les pages qui n en ont pas
 * besoin.
 */
async function resolveUser(token: string | undefined) {
	try {
		return await validateSession(token);
	} catch (error) {
		console.error('[session] base injoignable, visiteur traité comme anonyme :', error);
		return null;
	}
}
