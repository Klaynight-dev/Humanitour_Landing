import { text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Sonde de vivacite du conteneur.
 *
 * Volontairement sans acces a la base : cette sonde repond « le serveur ecoute
 * et sert des requetes », pas « toute l'infrastructure va bien ». La brancher
 * sur la base ferait redemarrer le site en boucle pendant une panne de
 * PostgreSQL, ce qui ajouterait une indisponibilite a une autre au lieu de
 * laisser les pages servir ce qu'elles peuvent encore servir.
 */
export const GET: RequestHandler = () => {
	return text('ok', { headers: { 'cache-control': 'no-store' } });
};
