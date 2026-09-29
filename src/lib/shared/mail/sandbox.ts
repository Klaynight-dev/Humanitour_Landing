/**
 * L'enveloppe dans laquelle s'affiche le HTML d'un courriel recu.
 *
 * Ce HTML vient de n'importe qui. Il n'est jamais insere dans une page du
 * back-office : il est rendu dans un `<iframe sandbox>` sans `allow-scripts`,
 * et ce document y ajoute une politique de securite qui interdit toute
 * requete sortante, sauf les images qu'on choisit d'afficher.
 *
 * Les images distantes sont bloquees par defaut, comme dans toute messagerie
 * soucieuse de la vie privee : une image chargee a l'ouverture dit a
 * l'expediteur que le message a ete lu, quand, et depuis quelle adresse IP.
 */

export interface SandboxOptions {
	/** Charger les images distantes (HTTPS seulement). */
	readonly remoteImages: boolean;
}

/** Politique de securite du document affiche. */
export function sandboxPolicy(options: SandboxOptions): string {
	const images = options.remoteImages ? 'data: https:' : 'data:';
	return [
		"default-src 'none'",
		`img-src ${images}`,
		"style-src 'unsafe-inline'",
		'font-src data:',
		"form-action 'none'",
		"base-uri 'none'"
	].join('; ');
}

/** Le HTML contient-il une image distante ? Sert a proposer de les afficher. */
export function hasRemoteImages(html: string): boolean {
	return (
		/<img\b[^>]*\bsrc\s*=\s*["']?\s*https?:/i.test(html) || /url\(\s*["']?\s*https?:/i.test(html)
	);
}

/**
 * Le document complet, pret pour `srcdoc`.
 *
 * `<base target="_blank">` ouvre chaque lien dans un nouvel onglet plutot que
 * dans le cadre ; `no-referrer` n'annonce pas l'adresse du back-office au site
 * de destination. Les deux balises sont posees AVANT le HTML recu : une
 * seconde `<base>` dans le message serait ignoree, la premiere l'emportant.
 */
export function sandboxedDocument(html: string, options: SandboxOptions): string {
	return [
		'<!doctype html><html><head>',
		'<meta charset="utf-8">',
		`<meta http-equiv="Content-Security-Policy" content="${sandboxPolicy(options)}">`,
		'<meta name="referrer" content="no-referrer">',
		'<base target="_blank">',
		'<style>body{margin:0;padding:8px;font-family:system-ui,sans-serif;color:#000;background:#fff;overflow-wrap:anywhere}img{max-width:100%;height:auto}</style>',
		'</head><body>',
		html,
		'</body></html>'
	].join('');
}
