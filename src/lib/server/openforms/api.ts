import { parseSchema } from '$lib/shared/openforms/parse';
import type { OpenformsForm } from '$lib/shared/openforms/types';
import { call, OpenformsError } from './client';

/**
 * Les six appels dont ce depot a besoin, et pas un de plus.
 *
 * Openforms expose une API bien plus large (edition des formulaires, tableur,
 * commentaires, versions). Rien de tout cela n'a sa place ici : le
 * questionnaire se construit chez Openforms, ce site le sert, en recueille les
 * reponses et en publie les resultats.
 */

/** Un formulaire tel que la liste authentifiee le rend. */
export interface RemoteFormSummary {
	readonly id: string;
	readonly slug: string;
	readonly title: string;
	readonly isPublished: boolean;
	readonly responseCount: number;
	readonly startsAt: Date | null;
	readonly endsAt: Date | null;
	readonly maxResponses: number | null;
}

/** Une soumission, telle que la lecture authentifiee la rend. */
export interface RemoteSubmission {
	readonly id: string;
	readonly submittedAt: Date;
	readonly values: Readonly<Record<string, unknown>>;
}

export interface RemoteActivity {
	readonly date: string;
	readonly count: number;
}

/** Ce que le back-office affiche en direct, sans passer par le miroir. */
export interface RemoteSummary {
	readonly formId: string;
	readonly title: string;
	readonly isPublished: boolean;
	readonly totalResponses: number;
	readonly activity: readonly RemoteActivity[];
}

function readDate(raw: unknown): Date | null {
	if (typeof raw !== 'string' && !(raw instanceof Date)) return null;
	const parsed = raw instanceof Date ? raw : new Date(raw);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function readCount(raw: unknown): number {
	return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
}

/**
 * Formulaires visibles avec la cle de lecture.
 *
 * Sert l'ecran de liaison : l'operateur choisit dans cette liste plutot que de
 * recopier un identifiant a la main.
 */
export async function listForms(): Promise<readonly RemoteFormSummary[]> {
	const body = await call<{ forms?: unknown[] }>('/forms');

	return (body.forms ?? []).flatMap((entry): RemoteFormSummary[] => {
		if (!entry || typeof entry !== 'object') return [];
		const form = entry as Record<string, unknown>;
		if (typeof form.id !== 'string' || typeof form.slug !== 'string') return [];

		const counts = form._count as { responses?: unknown } | undefined;

		return [
			{
				id: form.id,
				slug: form.slug,
				title: typeof form.title === 'string' ? form.title : form.slug,
				isPublished: form.isPublished === true,
				responseCount: readCount(counts?.responses),
				startsAt: readDate(form.startsAt),
				endsAt: readDate(form.endsAt),
				maxResponses: typeof form.maxResponses === 'number' ? form.maxResponses : null
			}
		];
	});
}

/**
 * Definition publique d'un formulaire, pour le rendre sur `humanitour.fr`.
 *
 * Appel NON authentifie : c'est la meme vue qu'un visiteur obtiendrait, donc
 * celle contre laquelle sa soumission sera validee. L'interroger avec la cle de
 * lecture donnerait la vue d'un administrateur, et un formulaire encore
 * restreint paraitrait ouvert.
 */
export async function fetchPublicForm(slug: string): Promise<OpenformsForm> {
	const body = await call<{ form?: Record<string, unknown> }>(
		`/forms/public/${encodeURIComponent(slug)}`,
		{ authenticated: false }
	);

	return readForm(body.form, slug);
}

/**
 * La meme definition, lue avec la cle de lecture.
 *
 * Openforms repond 404 sur la vue publique d'un formulaire depublie : sans cet
 * appel, la correspondance des champs deviendrait inetablissable des la
 * cloture de la collecte, et les libelles disparaitraient de l'ecran de
 * liaison au moment ou l'operateur en a besoin.
 */
export async function fetchForm(formId: string): Promise<OpenformsForm> {
	const body = await call<{ form?: Record<string, unknown> }>(
		`/forms/${encodeURIComponent(formId)}`
	);

	return readForm(body.form, formId);
}

/** Lecture defensive d'une definition, quelle que soit la vue qui l'a rendue. */
function readForm(raw: Record<string, unknown> | undefined, fallback: string): OpenformsForm {
	if (!raw || typeof raw.id !== 'string') {
		throw new OpenformsError("Openforms n'a pas renvoyé de formulaire exploitable.");
	}

	return {
		id: raw.id,
		slug: typeof raw.slug === 'string' ? raw.slug : fallback,
		title: typeof raw.title === 'string' ? raw.title : fallback,
		description: typeof raw.description === 'string' ? raw.description : null,
		fields: parseSchema(raw.schema),
		requireConsent: raw.requireConsent !== false,
		consentText: typeof raw.consentText === 'string' ? raw.consentText : null,
		privacyPolicyUrl: typeof raw.privacyPolicyUrl === 'string' ? raw.privacyPolicyUrl : null
	};
}

/**
 * Le schema et toutes les soumissions, en un appel.
 *
 * Openforms dechiffre cote serveur quand le formulaire est chiffre au repos :
 * si la charge arrive encore scellee, c'est que la cle de l'instance manque, et
 * mieux vaut echouer que ranger « __enc » comme une reponse de plus.
 */
export async function fetchSubmissions(formId: string): Promise<{
	readonly fields: OpenformsForm['fields'];
	readonly submissions: readonly RemoteSubmission[];
}> {
	const body = await call<{ form?: Record<string, unknown>; rows?: unknown[] }>(
		`/responses/form/${encodeURIComponent(formId)}`
	);

	if (!body.form || typeof body.form.id !== 'string') {
		throw new OpenformsError("Openforms n'a pas renvoyé de formulaire exploitable.");
	}

	const rows = Array.isArray(body.rows) ? body.rows : [];
	const submissions = rows.flatMap((entry): RemoteSubmission[] => {
		if (!entry || typeof entry !== 'object') return [];
		const row = entry as Record<string, unknown>;
		if (typeof row.id !== 'string') return [];

		const values = (row.values ?? {}) as Record<string, unknown>;
		if ('__enc' in values) {
			throw new OpenformsError(
				"Les réponses arrivent chiffrées : l'instance Openforms n'a pas pu les déchiffrer. Vérifiez sa clé de chiffrement avant de resynchroniser."
			);
		}

		return [{ id: row.id, submittedAt: readDate(row.submittedAt) ?? new Date(), values }];
	});

	return { fields: parseSchema(body.form.schema), submissions };
}

/** Compteurs et activite trente jours, lus en direct pour le back-office. */
export async function fetchSummary(formId: string): Promise<RemoteSummary> {
	const body = await call<{ summary?: Record<string, unknown> }>(
		`/stats/form/${encodeURIComponent(formId)}/summary`
	);

	const summary = body.summary;
	if (!summary || typeof summary.formId !== 'string') {
		throw new OpenformsError("Openforms n'a pas renvoyé de statistiques exploitables.");
	}

	const activity = Array.isArray(summary.activity) ? summary.activity : [];

	return {
		formId: summary.formId,
		title: typeof summary.title === 'string' ? summary.title : '',
		isPublished: summary.isPublished === true,
		totalResponses: readCount(summary.totalResponses),
		activity: activity.flatMap((entry): RemoteActivity[] => {
			if (!entry || typeof entry !== 'object') return [];
			const point = entry as Record<string, unknown>;
			if (typeof point.date !== 'string') return [];
			return [{ date: point.date, count: readCount(point.count) }];
		})
	};
}

export interface SubmitInput {
	readonly formId: string;
	readonly data: Readonly<Record<string, unknown>>;
	readonly consent: boolean;
	/** Adresse du repondant, pour que le quota distant s'applique a lui. */
	readonly forwardedFor?: string;
}

/**
 * Depose une reponse chez Openforms.
 *
 * Openforms revalide tout : planification, quota, consentement, bornes de
 * chaque champ. C'est LUI qui fait autorite, et c'est voulu — la validation
 * faite ici sert le confort du repondant, pas la conformite de la donnee.
 *
 * @returns l'identifiant de la soumission distante.
 */
export async function submitResponse(input: SubmitInput): Promise<string> {
	const body = await call<{ responseId?: unknown }>('/responses/submit', {
		method: 'POST',
		authenticated: false,
		forwardedFor: input.forwardedFor,
		body: { formId: input.formId, data: input.data, consent: input.consent }
	});

	if (typeof body.responseId !== 'string') {
		throw new OpenformsError("Openforms a accepté la réponse sans en rendre l'identifiant.");
	}

	return body.responseId;
}
