import { parseEmail } from '$lib/shared/newsletter';

/**
 * Adresses, objets et citations de la messagerie.
 *
 * Isomorphe : le formulaire de redaction controle les destinataires avant
 * l'envoi, et le serveur refait exactement le meme controle a la reception du
 * formulaire.
 */

export interface MailboxAddress {
	readonly name: string | null;
	readonly address: string;
}

/** Nombre maximal de destinataires d'un envoi, limite fixee par Resend. */
export const MAX_RECIPIENTS = 50;

/**
 * Lit `Nom <adresse>`, `"Nom, avec virgule" <adresse>` ou `adresse` seule.
 *
 * L'adresse est normalisee comme celle des abonnes : une seule forme en base,
 * sinon un meme correspondant ouvrirait deux fils.
 */
export function parseMailbox(raw: string): MailboxAddress | null {
	const value = raw.trim();
	if (value === '') return null;

	const angle = /^(.*?)<([^<>]+)>$/.exec(value);
	const candidate = angle?.[2] ?? value;
	const parsed = parseEmail(candidate);
	if (!parsed.ok) return null;

	const name = (angle?.[1] ?? '')
		.trim()
		.replace(/^"(.*)"$/, '$1')
		.trim();
	return { name: name === '' ? null : name, address: parsed.email };
}

/** `Nom <adresse>`, le nom entre guillemets des qu'il contient un separateur. */
export function formatMailbox(mailbox: MailboxAddress): string {
	if (!mailbox.name) return mailbox.address;
	const name = mailbox.name.replace(/["\\<>\r\n]/g, '');
	const quoted = /[,;:@()[\]]/.test(name) ? `"${name}"` : name;
	return `${quoted} <${mailbox.address}>`;
}

/**
 * Decoupe un champ de destinataires sur la virgule, le point-virgule ou le
 * retour a la ligne, en respectant les guillemets d'un nom.
 */
function splitRecipients(raw: string): string[] {
	const parts: string[] = [];
	let current = '';
	let quoted = false;

	for (const char of raw) {
		if (char === '"') quoted = !quoted;
		if (!quoted && (char === ',' || char === ';' || char === '\n')) {
			parts.push(current);
			current = '';
			continue;
		}
		current += char;
	}

	parts.push(current);
	return parts.map((part) => part.trim()).filter((part) => part !== '');
}

export interface RecipientList {
	/** Adresses retenues, normalisees, sans doublon. */
	readonly addresses: readonly string[];
	/** Saisies qui ne sont pas une adresse, telles que tapees. */
	readonly invalid: readonly string[];
}

export function parseRecipients(raw: string): RecipientList {
	const addresses: string[] = [];
	const invalid: string[] = [];

	for (const part of splitRecipients(raw)) {
		const mailbox = parseMailbox(part);
		if (mailbox === null) {
			invalid.push(part);
			continue;
		}
		if (!addresses.includes(mailbox.address)) addresses.push(mailbox.address);
	}

	return { addresses, invalid };
}

const SUBJECT_PREFIX = /^\s*(re|fwd?|tr|réf|ref|aw|wg)\s*(\[\d+\])?\s*:\s*/i;

/**
 * L'objet sans ses prefixes de reponse et de transfert.
 *
 * Sert au rattachement d'un courriel a un fil quand il ne porte pas
 * d'en-tete `In-Reply-To` : « RE: Tr: Question » et « Question » parlent de la
 * meme chose.
 */
export function baseSubject(subject: string): string {
	let current = subject.trim();
	let previous = '';
	while (current !== previous) {
		previous = current;
		current = current.replace(SUBJECT_PREFIX, '');
	}
	return current.trim();
}

export function replySubject(subject: string): string {
	const base = baseSubject(subject);
	return base === '' ? 'Re: (sans objet)' : `Re: ${base}`;
}

export function forwardSubject(subject: string): string {
	const base = baseSubject(subject);
	return base === '' ? 'Tr: (sans objet)' : `Tr: ${base}`;
}

const QUOTE_DATE = new Intl.DateTimeFormat('fr-FR', {
	dateStyle: 'long',
	timeStyle: 'short',
	timeZone: 'Europe/Paris'
});

/** « Le 29 septembre 2026 à 14:03, Alice <alice@exemple.fr> a écrit : » */
export function quoteHeader(date: Date, from: MailboxAddress): string {
	return `Le ${QUOTE_DATE.format(date)}, ${formatMailbox(from)} a écrit :`;
}

/** En-tete du bloc transfere, dans la forme que lisent toutes les messageries. */
export function forwardHeader(input: {
	readonly date: Date;
	readonly from: MailboxAddress;
	readonly to: readonly string[];
	readonly subject: string;
}): string {
	return [
		'---------- Message transféré ----------',
		`De : ${formatMailbox(input.from)}`,
		`Date : ${QUOTE_DATE.format(input.date)}`,
		`Objet : ${input.subject}`,
		`À : ${input.to.join(', ')}`
	].join('\n');
}

/** Les premiers mots d'un message, pour la liste des fils. */
export function snippet(text: string | null | undefined, length = 140): string {
	const flat = (text ?? '')
		.split(/\r?\n/)
		.filter((line) => !line.trimStart().startsWith('>'))
		.join(' ')
		.replace(/\s+/g, ' ')
		.trim();
	return flat.length <= length ? flat : `${flat.slice(0, length - 1).trimEnd()}…`;
}

/**
 * Un `Message-ID` ou une liste `References`, reduits a leurs identifiants.
 *
 * L'en-tete peut etre replie sur plusieurs lignes et separe par des espaces ;
 * seuls les `<...>` comptent.
 */
export function messageIds(header: string | null | undefined): string[] {
	if (!header) return [];
	return [...header.matchAll(/<[^<>\s]+>/g)].map((match) => match[0]);
}

/** La chaine `References` d'une reponse : celle du message cite, plus son identifiant. */
export function replyReferences(
	previous: string | null | undefined,
	messageId: string | null
): string | null {
	const ids = messageIds(previous);
	if (messageId && !ids.includes(messageId)) ids.push(messageId);
	return ids.length === 0 ? null : ids.join(' ');
}
