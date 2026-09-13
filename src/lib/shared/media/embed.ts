/**
 * Conversion d une URL de video en URL d integration.
 *
 * Point sensible : une iframe execute du code tiers dans le contexte du site.
 * On ne fait donc JAMAIS confiance a l URL saisie au back-office. On reconnait
 * l hebergeur, on en extrait l identifiant, et on RECONSTRUIT l URL nous-memes.
 * Une URL dont l hebergeur n est pas dans la liste est refusee, pas affichee.
 *
 * Ajouter un hebergeur ou une instance PeerTube = une ligne ici.
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

/** Identifiant PeerTube : UUID court ou long, selon la version de l instance. */
const PEERTUBE_ID = /^[\w-]{8,40}$/;

function youtubeId(url: URL): string | null {
	if (url.hostname === 'youtu.be') return url.pathname.slice(1) || null;

	if (url.pathname === '/watch') return url.searchParams.get('v');
	// Formats /embed/ID et /shorts/ID.
	const match = /^\/(?:embed|shorts|v)\/([\w-]{6,20})/.exec(url.pathname);
	return match?.[1] ?? null;
}

function normaliseHost(hostname: string): string {
	return hostname.replace(/^www\./, '').toLowerCase();
}

/**
 * Reconnait l hebergeur et fabrique l URL d integration.
 *
 * Aucune donnee de l URL d origine n est reportee telle quelle dans l iframe :
 * seul l identifiant extrait, apres validation de sa forme, sert a reconstruire
 * une adresse dont nous controlons chaque caractere.
 */
export function resolveEmbed(rawUrl: string): EmbedResult {
	let url: URL;

	try {
		url = new URL(rawUrl.trim());
	} catch {
		return { ok: false, reason: "Ce n'est pas une adresse valide." };
	}

	if (url.protocol !== 'https:') {
		return { ok: false, reason: 'Seules les adresses en HTTPS sont acceptees.' };
	}

	const host = normaliseHost(url.hostname);

	if (host === 'youtube.com' || host === 'youtu.be' || host === 'youtube-nocookie.com') {
		const id = youtubeId(url);
		if (!id || !/^[\w-]{6,20}$/.test(id)) {
			return { ok: false, reason: 'Identifiant de video YouTube introuvable dans cette adresse.' };
		}
		return {
			ok: true,
			target: {
				provider: 'youtube',
				providerLabel: 'YouTube',
				// Domaine « nocookie » : pas de cookie publicitaire tant que le
				// visiteur n a pas lance la lecture.
				embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
				watchUrl: `https://www.youtube.com/watch?v=${id}`
			}
		};
	}

	if (host === 'vimeo.com' || host === 'player.vimeo.com') {
		const match = /(\d{6,12})/.exec(url.pathname);
		if (!match) return { ok: false, reason: 'Identifiant de video Vimeo introuvable.' };
		return {
			ok: true,
			target: {
				provider: 'vimeo',
				providerLabel: 'Vimeo',
				embedUrl: `https://player.vimeo.com/video/${match[1]}`,
				watchUrl: `https://vimeo.com/${match[1]}`
			}
		};
	}

	if (PEERTUBE_HOSTS.includes(host)) {
		const match = /\/w\/([\w-]+)|\/videos\/(?:watch|embed)\/([\w-]+)/.exec(url.pathname);
		const id = match?.[1] ?? match?.[2];
		if (!id || !PEERTUBE_ID.test(id)) {
			return { ok: false, reason: 'Identifiant de video PeerTube introuvable.' };
		}
		return {
			ok: true,
			target: {
				provider: 'peertube',
				providerLabel: 'PeerTube',
				embedUrl: `https://${host}/videos/embed/${id}`,
				watchUrl: `https://${host}/w/${id}`
			}
		};
	}

	return {
		ok: false,
		reason: `Hebergeur non autorise : ${host}. Hebergeurs acceptes : YouTube, Vimeo, PeerTube (${PEERTUBE_HOSTS.join(', ')}).`
	};
}

/** Liste lisible des hebergeurs acceptes, pour l aide du back-office. */
export function allowedProviders(): readonly string[] {
	return ['YouTube', 'Vimeo', ...PEERTUBE_HOSTS.map((host) => `PeerTube (${host})`)];
}
