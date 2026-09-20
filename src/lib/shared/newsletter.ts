/**
 * L adresse d un abonne a l infolettre : normalisation et controle.
 *
 * Isole dans `shared` parce que deux pages s en servent, l inscription et la
 * desinscription. Une adresse acceptee d un cote mais refusee de l autre
 * enfermerait son proprietaire dans un abonnement dont il ne pourrait plus
 * sortir : c est la meme fonction des deux cotes, ou rien.
 */

/** Longueur maximale d une adresse, RFC 5321. */
export const EMAIL_MAX_LENGTH = 254;

/**
 * Normalise une saisie : espaces rognes, casse rabattue.
 *
 * La RFC autorise une partie locale sensible a la casse, mais aucun service
 * courant ne l exploite, et la respecter ici abonnerait `A@exemple.fr` et
 * `a@exemple.fr` separement — deux courriels pour une personne, et une
 * desinscription qui n en retirerait qu un.
 */
export function normalizeEmail(raw: string): string {
	return raw.trim().toLocaleLowerCase('en-US');
}

export type EmailResult =
	{ readonly ok: true; readonly email: string } | { readonly ok: false; readonly reason: string };

/**
 * Controle de forme, volontairement grossier.
 *
 * Une expression reguliere qui pretend valider la RFC 5322 refuse des adresses
 * valides et en accepte d invalides ; seul l envoi d un courriel prouve qu une
 * adresse existe. On ne verifie donc que ce qui est certain : une partie
 * locale, un arobase, un domaine pointe, pas d espace, et une longueur tenable.
 */
export function parseEmail(raw: string): EmailResult {
	const email = normalizeEmail(raw);

	if (email === '') {
		return { ok: false, reason: 'Renseignez votre adresse électronique.' };
	}

	if (email.length > EMAIL_MAX_LENGTH) {
		return { ok: false, reason: 'Cette adresse est trop longue pour être une adresse valide.' };
	}

	if (/\s/.test(email)) {
		return { ok: false, reason: 'Une adresse électronique ne contient pas d’espace.' };
	}

	const parts = email.split('@');
	if (parts.length !== 2) {
		return { ok: false, reason: 'Une adresse électronique contient un seul arobase.' };
	}

	// Les deux parts existent, la longueur vient d'etre verifiee ; mais
	// `noUncheckedIndexedAccess` lit tout acces indexe comme possiblement vide.
	// Le repli n'est pas un cas de plus, c'est un rappel au compilateur.
	const local = parts[0] ?? '';
	const domain = parts[1] ?? '';

	if (local === '' || domain === '') {
		return { ok: false, reason: 'Il manque une partie à cette adresse.' };
	}

	// Un domaine sans point est soit un intranet, soit une faute de frappe. Dans
	// les deux cas, l infolettre n y arrivera jamais.
	if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
		return { ok: false, reason: 'Le domaine de cette adresse semble incomplet.' };
	}

	return { ok: true, email };
}
