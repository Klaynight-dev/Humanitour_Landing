/**
 * Pieces jointes : ce qu'on envoie, et comment on sert ce qu'on recoit.
 */

/** Total des pieces jointes d'un envoi. Resend accepte 40 Mo, les messageries destinataires souvent 25. */
export const MAX_ATTACHMENTS_BYTES = 25 * 1024 * 1024;

/**
 * Extensions refusees a l'envoi, celles que Gmail et Outlook bloquent aussi :
 * un courriel de l'association qui porte un executable finirait en indesirable,
 * et abimerait la reputation du domaine pour tous les envois suivants.
 */
const BLOCKED_EXTENSIONS = new Set([
	'exe',
	'bat',
	'cmd',
	'com',
	'scr',
	'msi',
	'vbs',
	'js',
	'jse',
	'wsf',
	'ps1',
	'jar',
	'apk',
	'dll'
]);

export interface AttachmentCandidate {
	readonly name: string;
	readonly size: number;
}

function extension(name: string): string {
	const dot = name.lastIndexOf('.');
	return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

/** L'erreur a afficher, ou `null` si les pieces jointes peuvent partir. */
export function checkAttachments(files: readonly AttachmentCandidate[]): string | null {
	const blocked = files.find((file) => BLOCKED_EXTENSIONS.has(extension(file.name)));
	if (blocked)
		return `« ${blocked.name} » est un programme : les messageries le bloquent, il ne part pas.`;

	const total = files.reduce((sum, file) => sum + file.size, 0);
	if (total > MAX_ATTACHMENTS_BYTES) {
		return `Les pièces jointes pèsent ${formatBytes(total)}, au-delà des ${formatBytes(MAX_ATTACHMENTS_BYTES)} acceptés.`;
	}

	return null;
}

/**
 * Types qu'on peut afficher dans le navigateur plutot que telecharger.
 *
 * Seules des images matricielles : un HTML, un SVG ou un PDF recus par
 * courriel viennent d'un inconnu, et, servis depuis l'origine du site, ils
 * s'executeraient avec la session du membre qui les ouvre. Tout le reste part
 * en telechargement.
 */
const INLINE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

export function isSafeInline(contentType: string): boolean {
	return INLINE_TYPES.has(contentType.toLowerCase().split(';', 1)[0]?.trim() ?? '');
}

const UNITS = ['o', 'Ko', 'Mo', 'Go'] as const;

/** « 1,2 Mo » : la taille d'une piece jointe, en francais. */
export function formatBytes(bytes: number): string {
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < UNITS.length - 1) {
		value /= 1024;
		unit += 1;
	}
	const digits = unit === 0 || value >= 10 ? 0 : 1;
	return `${value.toLocaleString('fr-FR', { maximumFractionDigits: digits })} ${UNITS[unit]}`;
}
