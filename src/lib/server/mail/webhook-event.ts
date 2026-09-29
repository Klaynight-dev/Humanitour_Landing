/**
 * Lecture d'un evenement de webhook Resend.
 *
 * La charge est signee, donc authentique ; elle reste une donnee exterieure,
 * lue champ par champ plutot que transtypee. Un champ manquant ou d'un autre
 * type donne une valeur vide, jamais une exception au milieu du traitement.
 */

export interface WebhookEvent {
	readonly type: string;
	/** Identifiant Resend du courriel concerne. */
	readonly emailId: string | null;
	readonly to: readonly string[];
	/** `Permanent` ou `Transient` pour un rebond, `null` sinon. */
	readonly bounceType: string | null;
	/** Explication lisible d'un rebond ou d'un echec, telle que donnee par Resend. */
	readonly detail: string | null;
	readonly tags: Readonly<Record<string, string>>;
}

function record(value: unknown): Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function text(value: unknown): string | null {
	return typeof value === 'string' && value !== '' ? value : null;
}

/**
 * Les etiquettes arrivent en objet (`{ kind: "campaign" }`) dans les exemples de
 * la documentation, mais s'envoient en tableau (`[{ name, value }]`) : les
 * deux formes sont lues.
 */
function tagsOf(value: unknown): Record<string, string> {
	const tags: Record<string, string> = {};

	if (Array.isArray(value)) {
		for (const entry of value) {
			const { name, value: tagValue } = record(entry);
			if (typeof name === 'string' && typeof tagValue === 'string') tags[name] = tagValue;
		}
		return tags;
	}

	for (const [name, tagValue] of Object.entries(record(value))) {
		if (typeof tagValue === 'string') tags[name] = tagValue;
	}
	return tags;
}

function detailOf(data: Record<string, unknown>): string | null {
	const bounce = record(data.bounce);
	const failed = record(data.failed);
	return text(bounce.message) ?? text(failed.reason) ?? text(record(data.error).message);
}

export function parseWebhookEvent(payload: unknown): WebhookEvent | null {
	const root = record(payload);
	const type = text(root.type);
	if (type === null) return null;

	const data = record(root.data);
	const to = Array.isArray(data.to)
		? data.to.filter((entry): entry is string => typeof entry === 'string')
		: [];

	return {
		type,
		emailId: text(data.email_id),
		to,
		bounceType: text(record(data.bounce).type),
		detail: detailOf(data),
		tags: tagsOf(data.tags)
	};
}

/**
 * Un rebond qui dit que l'adresse n'existe pas, ou n'existera plus pour nous :
 * rebond definitif, ou adresse deja sur la liste de suppression de Resend.
 * Un rebond passager (boite pleine, serveur indisponible) ne desinscrit
 * personne.
 */
export function isPermanentFailure(event: WebhookEvent): boolean {
	if (event.type === 'email.suppressed') return true;
	return event.type === 'email.bounced' && event.bounceType?.toLowerCase() === 'permanent';
}
