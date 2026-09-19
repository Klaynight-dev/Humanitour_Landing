import { json } from '@sveltejs/kit';

/**
 * Reponses de l API publique.
 *
 * `/api/public/**` est un CONTRAT (AGENTS.md section 1.4) : on ajoute des
 * champs, on n en renomme jamais. Les cles sont en francais, comme les libelles
 * qu elles transportent, et comme le vocabulaire de l enquete ; melanger
 * `respondents` et `repondants` dans la meme charge obligerait chaque
 * reutilisateur a apprendre deux dialectes.
 */

/**
 * En-tetes de toute reponse publique.
 *
 * Ouverte a toute origine : des donnees publiees sous ODbL, telechargeables
 * sans compte, n ont aucune raison d etre refusees au carnet Jupyter ou a la
 * page d un journaliste. Cinq minutes de cache absorbent une reprise d article
 * sans servir un chiffre perime.
 */
const HEADERS: Readonly<Record<string, string>> = {
	'access-control-allow-origin': '*',
	'cache-control': 'public, max-age=300',
	'x-licence': 'ODbL-1.0'
};

export function publicJson(body: unknown): Response {
	return json(body, { headers: HEADERS });
}

/**
 * Erreur de l API publique.
 *
 * Le message est en francais et destine a un humain qui lit sa console : il dit
 * ce qui manque, pas seulement que quelque chose manque.
 */
export function publicError(status: number, message: string): Response {
	return json({ erreur: message }, { status, headers: HEADERS });
}
