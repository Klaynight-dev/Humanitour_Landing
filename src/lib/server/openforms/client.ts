import { env } from '$env/dynamic/private';

/**
 * Dialogue avec Openforms (`forms.humanitour.fr`, depot `Klaynight/Openforms`,
 * MIT), seul canal de collecte du projet.
 *
 * DEUX IDENTITES, et il ne faut pas les confondre.
 *
 *   - La cle `ofk_` vaut les droits du compte qui l'a creee. Elle sert a LIRE :
 *     lister les formulaires, recuperer les reponses, demander les statistiques.
 *     Elle ne quitte jamais le serveur, et le compte qui la porte ne doit voir
 *     QUE les formulaires de l'enquete, jamais etre super-administrateur.
 *
 *   - AUCUNE identite pour soumettre. Une reponse envoyee depuis
 *     `humanitour.fr` est la reponse d'un visiteur anonyme, pas celle de
 *     l'association : la signer avec la cle de lecture attribuerait chaque
 *     soumission au compte de l'institut.
 */

const KEY_PREFIX = 'ofk_';

/** Erreur de dialogue : reseau, droits, ou forme inattendue. */
export class OpenformsError extends Error {
	constructor(
		message: string,
		readonly status?: number,
		/** Detail par champ renvoye par une validation distante (422). */
		readonly details?: Readonly<Record<string, string>>
	) {
		super(message);
		this.name = 'OpenformsError';
	}
}

/** L'instance est-elle configuree ? Lu par le back-office avant de proposer la liaison. */
export function isConfigured(): boolean {
	return Boolean(env.OPENFORMS_URL?.trim() && env.OPENFORMS_API_KEY?.trim());
}

export function baseUrl(): string {
	const url = env.OPENFORMS_URL?.trim();
	if (!url) throw new OpenformsError("OPENFORMS_URL n'est pas configurée.");
	return url.replace(/\/+$/, '');
}

function apiKey(): string {
	const token = env.OPENFORMS_API_KEY?.trim();
	if (!token) throw new OpenformsError("OPENFORMS_API_KEY n'est pas configurée.");
	if (!token.startsWith(KEY_PREFIX)) {
		throw new OpenformsError(
			`OPENFORMS_API_KEY ne ressemble pas à une clé Openforms : elle doit commencer par « ${KEY_PREFIX} ».`
		);
	}
	return token;
}

interface CallOptions {
	readonly method?: 'GET' | 'POST';
	readonly body?: unknown;
	/** Fausse pour une soumission : voir l'en-tete de ce fichier. */
	readonly authenticated?: boolean;
	/**
	 * Adresse du repondant, relayee a la soumission.
	 *
	 * Openforms limite les soumissions par adresse. Sans ce relais, toutes
	 * celles qui passent par `humanitour.fr` porteraient l'adresse du serveur et
	 * se partageraient un seul quota : quinze reponses par minute pour le site
	 * entier, au lieu de quinze par repondant.
	 */
	readonly forwardedFor?: string;
}

/** Erreur distante lisible, ou message de repli. */
async function readFailure(response: Response): Promise<OpenformsError> {
	const body = (await response.json().catch(() => null)) as {
		error?: string;
		details?: Record<string, string>;
	} | null;

	// Le message d'Openforms est en francais et destine a un humain : on le
	// relaie tel quel plutot que d'inventer une paraphrase.
	return new OpenformsError(
		body?.error ?? `Openforms a répondu ${response.status}.`,
		response.status,
		body?.details
	);
}

export async function call<T>(path: string, options: CallOptions = {}): Promise<T> {
	/*
	 * La configuration est resolue AVANT le `try`. Lue a l'interieur, une cle mal
	 * prefixee levait son erreur dans le bloc, et le `catch` la rendait en
	 * « Openforms est injoignable » : l'operateur serait parti chercher une panne
	 * reseau devant un probleme de configuration.
	 */
	const target = `${baseUrl()}/api/v1${path}`;
	const headers: Record<string, string> = { accept: 'application/json' };

	if (options.authenticated !== false) headers.authorization = `Bearer ${apiKey()}`;
	if (options.body !== undefined) headers['content-type'] = 'application/json';
	if (options.forwardedFor) headers['x-forwarded-for'] = options.forwardedFor;

	let response: Response;
	try {
		response = await fetch(target, {
			method: options.method ?? 'GET',
			headers,
			body: options.body === undefined ? undefined : JSON.stringify(options.body)
		});
	} catch (cause) {
		// La cause reste attachee : sans elle, un certificat expire et une panne
		// DNS donneraient le meme message dans les journaux.
		const error = new OpenformsError(`Openforms est injoignable (${target}).`);
		error.cause = cause;
		throw error;
	}

	if (!response.ok) throw await readFailure(response);

	return (await response.json()) as T;
}
