/**
 * Protection contre les formulaires postes depuis un autre site.
 *
 * C'est le controle que SvelteKit fait lui-meme (`csrf.checkOrigin`), repris a
 * l'identique ici pour pouvoir en exempter une route, une seule : la
 * desinscription en un clic de l'infolettre (RFC 8058). Gmail et Yahoo la
 * postent depuis leurs serveurs, en formulaire et sans en-tete `Origin` ; le
 * controle de SvelteKit la refuserait, et il s'execute avant tout crochet, sans
 * exception possible par route.
 *
 * L'exemption est sans risque pour cette route precise : elle n'agit que sur
 * presentation d'une signature HMAC de l'adresse, et elle ne fait que RETIRER
 * une adresse de la liste.
 */

/** Routes exemptees, par chemin exact. Toute ajout demande la meme justification. */
export const CSRF_EXEMPT_PATHS: readonly string[] = ['/infolettre/desinscription/un-clic'];

const FORM_TYPES = ['application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain'];
const UNSAFE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

function isFormContentType(request: Request): boolean {
	const type = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() ?? '';
	return FORM_TYPES.includes(type);
}

export function isForbiddenCrossSiteForm(request: Request, url: URL): boolean {
	if (!UNSAFE_METHODS.includes(request.method)) return false;
	if (!isFormContentType(request)) return false;
	if (CSRF_EXEMPT_PATHS.includes(url.pathname)) return false;
	return request.headers.get('origin') !== url.origin;
}
