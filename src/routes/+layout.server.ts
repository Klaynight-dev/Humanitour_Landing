import type { LayoutServerLoad } from './$types';

/**
 * Expose l utilisateur de la session a toutes les pages.
 *
 * Seul le strict necessaire a l affichage descend jusqu au client : ni empreinte
 * de mot de passe, ni jeton, ni secret TOTP.
 */
export const load: LayoutServerLoad = ({ locals }) => {
	return { user: locals.user };
};
