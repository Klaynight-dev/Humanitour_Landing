import { hash, verify, type Algorithm } from '@node-rs/argon2';

/**
 * Hachage des mots de passe.
 *
 * Argon2id avec les parametres recommandes par l OWASP (memoire 19 Mio, deux
 * passes, parallelisme 1). Les parametres voyagent dans le hash produit : les
 * durcir plus tard ne casse aucun compte existant, les anciens hashs restent
 * verifiables et se remplacent a la prochaine connexion.
 *
 * `Algorithm` est declare `const enum` par la bibliotheque : sa VALEUR est
 * inaccessible sous `verbatimModuleSyntax`, seul son type l'est. D'ou la constante
 * annotee plutot que `Algorithm.Argon2id`.
 */
const ARGON2ID: Algorithm = 2;

const ARGON2_OPTIONS = {
	algorithm: ARGON2ID,
	memoryCost: 19_456,
	timeCost: 2,
	parallelism: 1
} as const;

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 256;

export type PasswordCheck = { readonly ok: true } | { readonly ok: false; readonly reason: string };

/**
 * Regle de solidite des mots de passe.
 *
 * Longueur minimale plutot que classes de caracteres obligatoires : c est la
 * recommandation actuelle de l ANSSI et du NIST, parce qu imposer « une majuscule
 * et un chiffre » produit surtout des « Motdepasse1 ».
 *
 * La borne haute existe pour une raison technique : Argon2 hache l entree
 * entiere, une chaine de plusieurs mega-octets serait un deni de service gratuit.
 */
export function checkPasswordStrength(password: string): PasswordCheck {
	if (password.length < PASSWORD_MIN_LENGTH) {
		return { ok: false, reason: `Le mot de passe doit faire au moins ${PASSWORD_MIN_LENGTH} caracteres.` };
	}

	if (password.length > PASSWORD_MAX_LENGTH) {
		return { ok: false, reason: `Le mot de passe ne peut pas depasser ${PASSWORD_MAX_LENGTH} caracteres.` };
	}

	if (password.trim().length === 0) {
		return { ok: false, reason: 'Le mot de passe ne peut pas etre uniquement des espaces.' };
	}

	return { ok: true };
}

export function hashPassword(password: string): Promise<string> {
	return hash(password, ARGON2_OPTIONS);
}

/**
 * Verifie un mot de passe contre son empreinte.
 *
 * Une empreinte illisible (tronquee, issue d un autre algorithme) fait echouer la
 * verification au lieu de propager l exception : cote appelant, un compte dont le
 * hash est corrompu doit se comporter comme un mauvais mot de passe, pas comme une
 * erreur 500 qui signalerait a un attaquant que le compte existe.
 */
export async function verifyPassword(storedHash: string, password: string): Promise<boolean> {
	try {
		return await verify(storedHash, password, ARGON2_OPTIONS);
	} catch {
		return false;
	}
}
