/**
 * Client Resend : envoi, envoi par lots, lecture du courrier recu.
 *
 * Ecrit sur `fetch` plutot qu'avec le SDK : cinq routes suffisent, et le SDK
 * embarque un moteur de rendu React dont ce depot n'a que faire. Le `fetch`
 * est injectable, ce qui rend le client testable sans reseau.
 *
 * Toutes les erreurs remontent en `ResendError`, avec le statut HTTP et le
 * message de Resend : c'est ce que l'ecran du back-office affiche, parce que
 * « domaine non verifie » ou « quota atteint » ne se devinent pas.
 */

export const RESEND_API = 'https://api.resend.com';

/** Taille maximale d'un envoi par lots, fixee par Resend. */
export const BATCH_SIZE = 100;

export class ResendError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly code: string | null = null
	) {
		super(message);
		this.name = 'ResendError';
	}
}

export interface OutgoingAttachment {
	readonly filename: string;
	/** Contenu encode en base64. */
	readonly content: string;
	readonly contentType?: string;
}

export interface OutgoingEmail {
	readonly from: string;
	readonly to: readonly string[];
	readonly cc?: readonly string[];
	readonly bcc?: readonly string[];
	readonly replyTo?: readonly string[];
	readonly subject: string;
	readonly html: string;
	readonly text: string;
	readonly headers?: Readonly<Record<string, string>>;
	readonly attachments?: readonly OutgoingAttachment[];
	/** Etiquettes Resend, rendues par les webhooks : elles disent d'ou vient l'envoi. */
	readonly tags?: Readonly<Record<string, string>>;
}

export interface ReceivedAttachment {
	readonly id: string;
	readonly filename: string | null;
	readonly contentType: string | null;
	readonly contentDisposition: string | null;
	readonly contentId: string | null;
	readonly size: number | null;
	readonly downloadUrl: string | null;
}

export interface ReceivedEmail {
	readonly id: string;
	readonly from: string;
	readonly to: readonly string[];
	readonly cc: readonly string[];
	readonly bcc: readonly string[];
	readonly replyTo: readonly string[];
	readonly receivedFor: readonly string[];
	readonly subject: string;
	readonly html: string | null;
	readonly text: string | null;
	readonly headers: Readonly<Record<string, string>>;
	readonly messageId: string | null;
	readonly createdAt: string;
	readonly authentication: Readonly<Record<string, string>>;
}

export interface ResendClient {
	send(email: OutgoingEmail, idempotencyKey?: string): Promise<{ id: string }>;
	sendBatch(emails: readonly OutgoingEmail[], idempotencyKey?: string): Promise<{ ids: string[] }>;
	getReceivedEmail(id: string): Promise<ReceivedEmail>;
	listReceivedAttachments(emailId: string): Promise<ReceivedAttachment[]>;
	download(url: string): Promise<Uint8Array>;
}

export interface ResendClientOptions {
	readonly token: string;
	readonly fetch?: typeof fetch;
	readonly baseUrl?: string;
}

/** Le corps attendu par `POST /emails`, en `snake_case`. */
function toPayload(email: OutgoingEmail): Record<string, unknown> {
	const payload: Record<string, unknown> = {
		from: email.from,
		to: [...email.to],
		subject: email.subject,
		html: email.html,
		text: email.text
	};

	if (email.cc?.length) payload.cc = [...email.cc];
	if (email.bcc?.length) payload.bcc = [...email.bcc];
	if (email.replyTo?.length) payload.reply_to = [...email.replyTo];
	if (email.headers && Object.keys(email.headers).length > 0)
		payload.headers = { ...email.headers };
	if (email.tags) {
		payload.tags = Object.entries(email.tags).map(([name, value]) => ({ name, value }));
	}
	if (email.attachments?.length) {
		payload.attachments = email.attachments.map((file) => ({
			filename: file.filename,
			content: file.content,
			...(file.contentType ? { content_type: file.contentType } : {})
		}));
	}

	return payload;
}

function strings(value: unknown): string[] {
	return Array.isArray(value)
		? value.filter((item): item is string => typeof item === 'string')
		: [];
}

function stringOrNull(value: unknown): string | null {
	return typeof value === 'string' ? value : null;
}

function stringRecord(value: unknown): Record<string, string> {
	if (value === null || typeof value !== 'object') return {};
	const record: Record<string, string> = {};
	for (const [key, entry] of Object.entries(value)) {
		if (typeof entry === 'string') record[key.toLowerCase()] = entry;
		else if (Array.isArray(entry)) record[key.toLowerCase()] = strings(entry).join(' ');
	}
	return record;
}

function toReceivedEmail(raw: Record<string, unknown>): ReceivedEmail {
	return {
		id: String(raw.id ?? ''),
		from: String(raw.from ?? ''),
		to: strings(raw.to),
		cc: strings(raw.cc),
		bcc: strings(raw.bcc),
		replyTo: strings(raw.reply_to),
		receivedFor: strings(raw.received_for),
		subject: typeof raw.subject === 'string' ? raw.subject : '',
		html: stringOrNull(raw.html),
		text: stringOrNull(raw.text),
		headers: stringRecord(raw.headers),
		messageId: stringOrNull(raw.message_id),
		createdAt: typeof raw.created_at === 'string' ? raw.created_at : new Date().toISOString(),
		authentication: stringRecord(raw.authentication)
	};
}

function toAttachment(raw: Record<string, unknown>): ReceivedAttachment {
	return {
		id: String(raw.id ?? ''),
		filename: stringOrNull(raw.filename),
		contentType: stringOrNull(raw.content_type),
		contentDisposition: stringOrNull(raw.content_disposition),
		contentId: stringOrNull(raw.content_id),
		size: typeof raw.size === 'number' ? raw.size : null,
		downloadUrl: stringOrNull(raw.download_url)
	};
}

export function createResendClient(options: ResendClientOptions): ResendClient {
	const doFetch = options.fetch ?? fetch;
	const base = options.baseUrl ?? RESEND_API;

	async function call(
		path: string,
		init: { method: string; body?: unknown; idempotencyKey?: string }
	) {
		const headers: Record<string, string> = { Authorization: `Bearer ${options.token}` };
		if (init.body !== undefined) headers['Content-Type'] = 'application/json';
		if (init.idempotencyKey) headers['Idempotency-Key'] = init.idempotencyKey.slice(0, 256);

		const response = await doFetch(`${base}${path}`, {
			method: init.method,
			headers,
			body: init.body === undefined ? undefined : JSON.stringify(init.body)
		});

		const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
		if (!response.ok) {
			const message =
				typeof payload?.message === 'string'
					? payload.message
					: `Resend a répondu ${response.status}.`;
			throw new ResendError(
				message,
				response.status,
				typeof payload?.name === 'string' ? payload.name : null
			);
		}

		return payload ?? {};
	}

	return {
		async send(email, idempotencyKey) {
			const payload = await call('/emails', {
				method: 'POST',
				body: toPayload(email),
				idempotencyKey
			});
			return { id: String(payload.id ?? '') };
		},

		async sendBatch(emails, idempotencyKey) {
			if (emails.length > BATCH_SIZE) {
				throw new ResendError(`Un lot compte au plus ${BATCH_SIZE} courriels.`, 400);
			}
			const payload = await call('/emails/batch', {
				method: 'POST',
				body: emails.map(toPayload),
				idempotencyKey
			});
			const data = Array.isArray(payload.data) ? (payload.data as Record<string, unknown>[]) : [];
			return { ids: data.map((entry) => String(entry.id ?? '')) };
		},

		async getReceivedEmail(id) {
			const payload = await call(`/emails/receiving/${encodeURIComponent(id)}`, { method: 'GET' });
			return toReceivedEmail(payload);
		},

		async listReceivedAttachments(emailId) {
			const payload = await call(
				`/emails/receiving/${encodeURIComponent(emailId)}/attachments?limit=100`,
				{
					method: 'GET'
				}
			);
			const data = Array.isArray(payload.data) ? (payload.data as Record<string, unknown>[]) : [];
			return data.map(toAttachment);
		},

		async download(url) {
			// Adresse signee et temporaire : elle ne demande pas le jeton, et
			// ne doit pas le recevoir, puisqu'elle pointe vers un CDN.
			const response = await doFetch(url);
			if (!response.ok)
				throw new ResendError(`Téléchargement impossible (${response.status}).`, response.status);
			return new Uint8Array(await response.arrayBuffer());
		}
	};
}
