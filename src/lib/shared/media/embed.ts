/**
 * Conversion d une URL de video en URL d integration.
 *
 * Point sensible : une iframe execute du code tiers dans le contexte du site.
 * On ne fait donc JAMAIS confiance a l URL saisie au back-office. On reconnait
 * l hebergeur, on en extrait l identifiant, et on RECONSTRUIT l URL nous-memes.
 * Une URL dont l hebergeur n est pas dans la table est refusee, pas affichee.
 *
 * Les hebergeurs sont des DONNEES, pas une chaine de `if` : ajouter YouTube a
 * cote de Vimeo ne doit pas rendre la fonction plus compliquee a relire.
 */

export interface EmbedTarget {
	readonly provider: string;
	readonly providerLabel: string;
	readonly embedUrl: string;
	/** Page publique chez l hebergeur, pour le lien « voir la source ». */
	readonly watchUrl: string;
}

export type EmbedResult =
	| { readonly ok: true; readonly target: EmbedTarget }
	| { readonly ok: false; readonly reason: string };

/**
 * Instances PeerTube acceptees.
 *
 * PeerTube est federe : il n existe pas de domaine unique. Autoriser n importe
 * quel hote reviendrait a laisser un compte du back-office integrer une page
 * arbitraire, donc la liste est explicite.
 */
const PEERTUBE_HOSTS: readonly string[] = [
	'framatube.org',
	'tilvids.com',
	'video.ploud.fr',
	'tube.numerique.gouv.fr'
];

interface Provider {
	readonly key: string;
	readonly label: string;
	/** Hotes reconnus, sans le « www. » de tete. */
	readonly hosts: readonly string[];
	/** Extrait l identifiant, ou `null` si l adresse n en contient pas. */
	extractId(url: URL): string | null;
	/** Reconstruit les adresses a partir du seul identifiant valide. */
	build(id: string, host: string): { embedUrl: string; watchUrl: string };
}

function youtubeId(url: URL): string | null {
	if (url.hostname.endsWith('youtu.be')) return url.pathname.slice(1) || null;
	if (url.pathname === '/watch') return url.searchParams.get('v');

	const match = /^\/(?:embed|shorts|v)\/([\w-]+)/.exec(url.pathname);
	return match?.[1] ?? null;
}

function firstMatch(pattern: RegExp, value: string): string | null {
	const match = pattern.exec(value);
	if (!match) return null;
	return match[1] ?? match[2] ?? null;
}

const PROVIDERS: readonly Provider[] = [
	{
		key: 'youtube',
		label: 'YouTube',
		hosts: ['youtube.com', 'youtu.be', 'youtube-nocookie.com', 'm.youtube.com'],
		extractId: (url) => {
			const id = youtubeId(url);
			return id && /^[\w-]{6,20}$/.test(id) ? id : null;
		},
		build: (id) => ({
			// Domaine « nocookie » : pas de cookie publicitaire tant que le visiteur
			// n a pas lance la lecture.
			embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
			watchUrl: `https://www.youtube.com/watch?v=${id}`
		})
	},
	{
		key: 'vimeo',
		label: 'Vimeo',
		hosts: ['vimeo.com', 'player.vimeo.com'],
		extractId: (url) => firstMatch(/\/(\d{6,12})/, url.pathname),
		build: (id) => ({
			embedUrl: `https://player.vimeo.com/video/${id}`,
			watchUrl: `https://vimeo.com/${id}`
		})
	},
	{
		key: 'peertube',
		label: 'PeerTube',
		hosts: PEERTUBE_HOSTS,
		extractId: (url) => {
			const id = firstMatch(/\/w\/([\w-]+)|\/videos\/(?:watch|embed)\/([\w-]+)/, url.pathname);
			return id && /^[\w-]{8,40}$/.test(id) ? id : null;
		},
		build: (id, host) => ({
			embedUrl: `https://${host}/videos/embed/${id}`,
			watchUrl: `https://${host}/w/${id}`
		})
	}
];

function normaliseHost(hostname: string): string {
	return hostname.replace(/^www\./, '').toLowerCase();
}

function parseHttps(rawUrl: string): URL | null {
	try {
		const url = new URL(rawUrl.trim());
		return url.protocol === 'https:' ? url : null;
	} catch {
		return null;
	}
}

/**
 * Reconnait l hebergeur et fabrique l URL d integration.
 *
 * Aucune donnee de l URL d origine n est reportee telle quelle dans l iframe :
 * seul l identifiant extrait, apres validation de sa forme, sert a reconstruire
 * une adresse dont nous controlons chaque caractere.
 */
export function resolveEmbed(rawUrl: string): EmbedResult {
	const url = parseHttps(rawUrl);
	if (!url) {
		return { ok: false, reason: "Adresse invalide : seules les adresses HTTPS sont acceptees." };
	}

	const host = normaliseHost(url.hostname);
	const provider = PROVIDERS.find((candidate) => candidate.hosts.includes(host));

	if (!provider) {
		return {
			ok: false,
			reason: `Hebergeur non autorise : ${host}. Hebergeurs acceptes : ${allowedProviders().join(', ')}.`
		};
	}

	const id = provider.extractId(url);
	if (!id) {
		return { ok: false, reason: `Identifiant de video ${provider.label} introuvable dans cette adresse.` };
	}

	return {
		ok: true,
		target: { provider: provider.key, providerLabel: provider.label, ...provider.build(id, host) }
	};
}

/** Liste lisible des hebergeurs acceptes, pour l aide du back-office. */
export function allowedProviders(): readonly string[] {
	return PROVIDERS.flatMap((provider) =>
		provider.key === 'peertube'
			? PEERTUBE_HOSTS.map((host) => `PeerTube (${host})`)
			: [provider.label]
	);
}
