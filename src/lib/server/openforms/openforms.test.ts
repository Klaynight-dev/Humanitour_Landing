import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Le dialogue avec Openforms.
 *
 * Deux surfaces, et seule la premiere merite vraiment d'etre couverte ligne a
 * ligne : la LECTURE de ce qu'Openforms renvoie. Tout ce qui entre dans le jeu
 * de donnees publie passe par la, et une reponse mal formee doit produire une
 * erreur nommee, jamais une valeur inventee.
 *
 * L'environnement est pose avant l'import des modules, parce que
 * `$env/dynamic/private` est lu a l'appel : le simuler ici evite d'avoir a
 * demarrer une instance pour tester une lecture de JSON.
 */
vi.mock('$env/dynamic/private', () => ({
	env: {
		OPENFORMS_URL: 'https://forms.exemple.test/',
		OPENFORMS_API_KEY: 'ofk_test'
	}
}));

const { env } = await import('$env/dynamic/private');
const { fetchForm, fetchPublicForm, fetchSubmissions, fetchSummary, listForms, submitResponse } =
	await import('./api');
const { isConfigured } = await import('./client');
const { toRowSet } = await import('./rows');

/** Reponse HTTP simulee, au plus pres de ce que rend `fetch`. */
function reply(body: unknown, status = 200): Response {
	return {
		ok: status >= 200 && status < 300,
		status,
		json: async () => body
	} as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
	fetchMock.mockReset();
	vi.stubGlobal('fetch', fetchMock);
	env.OPENFORMS_URL = 'https://forms.exemple.test/';
	env.OPENFORMS_API_KEY = 'ofk_test';
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('configuration', () => {
	it('se declare configuree quand les deux variables sont presentes', () => {
		expect(isConfigured()).toBe(true);
	});

	it('se declare non configuree des qu il en manque une', () => {
		env.OPENFORMS_API_KEY = '';
		expect(isConfigured()).toBe(false);
	});

	it('refuse une cle qui n a pas le bon prefixe, sans parler de panne reseau', async () => {
		// Une cle mal prefixee lue dans le bloc d'appel donnait « Openforms est
		// injoignable » : l'operateur partait chercher une panne devant un
		// probleme de configuration.
		env.OPENFORMS_API_KEY = 'sk-je-me-trompe-d-outil';

		await expect(listForms()).rejects.toThrow(/ofk_/);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('refuse une URL absente', async () => {
		env.OPENFORMS_URL = '';
		await expect(listForms()).rejects.toThrow(/OPENFORMS_URL/);
	});
});

describe('appels et erreurs', () => {
	it('porte la cle et coupe la barre finale de l URL', async () => {
		fetchMock.mockResolvedValue(reply({ forms: [] }));

		await listForms();

		const [url, init] = fetchMock.mock.calls[0]!;
		expect(url).toBe('https://forms.exemple.test/api/v1/forms');
		expect(init.headers.authorization).toBe('Bearer ofk_test');
	});

	it('relaie le message francais d Openforms plutot qu une paraphrase', async () => {
		fetchMock.mockResolvedValue(reply({ error: 'Accès refusé.' }, 403));

		await expect(listForms()).rejects.toMatchObject({
			message: 'Accès refusé.',
			status: 403
		});
	});

	it('se rabat sur le code quand le corps d erreur est illisible', async () => {
		fetchMock.mockResolvedValue({
			ok: false,
			status: 502,
			json: async () => {
				throw new Error('pas du JSON');
			}
		} as unknown as Response);

		await expect(listForms()).rejects.toThrow(/502/);
	});

	it('conserve la cause d une panne reseau', async () => {
		// Sans elle, un certificat expire et une panne DNS donneraient le meme
		// message dans les journaux.
		const cause = new Error('ENOTFOUND');
		fetchMock.mockRejectedValue(cause);

		await expect(listForms()).rejects.toMatchObject({ cause });
	});
});

describe('listForms', () => {
	it('lit un formulaire complet', async () => {
		fetchMock.mockResolvedValue(
			reply({
				forms: [
					{
						id: 'f1',
						slug: 'enquete',
						title: 'Enquête 2027',
						isPublished: true,
						maxResponses: 1000,
						startsAt: '2026-06-01T00:00:00.000Z',
						endsAt: null,
						_count: { responses: 42 }
					}
				]
			})
		);

		const [form] = await listForms();

		expect(form).toMatchObject({
			id: 'f1',
			slug: 'enquete',
			title: 'Enquête 2027',
			isPublished: true,
			responseCount: 42,
			maxResponses: 1000
		});
		expect(form?.startsAt).toBeInstanceOf(Date);
		expect(form?.endsAt).toBeNull();
	});

	it('ecarte une entree sans identifiant ni slug exploitable', async () => {
		fetchMock.mockResolvedValue(reply({ forms: [{ title: 'Sans clé' }, null, 'texte'] }));
		expect(await listForms()).toHaveLength(0);
	});

	it('retombe sur le slug quand le titre manque', async () => {
		fetchMock.mockResolvedValue(reply({ forms: [{ id: 'f1', slug: 'enquete' }] }));
		expect((await listForms())[0]?.title).toBe('enquete');
	});

	it('rend une liste vide quand la reponse n en porte pas', async () => {
		fetchMock.mockResolvedValue(reply({}));
		expect(await listForms()).toEqual([]);
	});

	it('ignore une date illisible plutot que de rendre une date invalide', async () => {
		fetchMock.mockResolvedValue(
			reply({ forms: [{ id: 'f1', slug: 's', startsAt: 'bientôt' }] })
		);
		expect((await listForms())[0]?.startsAt).toBeNull();
	});
});

describe('fetchPublicForm', () => {
	it('n envoie PAS la cle de lecture', async () => {
		// L'interroger avec la cle donnerait la vue d'un administrateur : un
		// formulaire encore restreint paraitrait ouvert au visiteur.
		fetchMock.mockResolvedValue(reply({ form: { id: 'f1', slug: 's', schema: [] } }));

		await fetchPublicForm('s');

		expect(fetchMock.mock.calls[0]![1].headers.authorization).toBeUndefined();
	});

	it('lit la definition et son schema', async () => {
		fetchMock.mockResolvedValue(
			reply({
				form: {
					id: 'f1',
					slug: 'enquete',
					title: 'Enquête',
					description: 'Quatre questions.',
					requireConsent: true,
					consentText: "J'accepte.",
					privacyPolicyUrl: 'https://humanitour.fr/legal',
					schema: [{ key: 'priorite', type: 'radio', label: 'Priorité' }]
				}
			})
		);

		const form = await fetchPublicForm('enquete');

		expect(form.title).toBe('Enquête');
		expect(form.fields).toHaveLength(1);
		expect(form.requireConsent).toBe(true);
	});

	it('considere le consentement requis par defaut', () => {
		// Le defaut penche du cote prudent : un formulaire dont la reponse
		// n'indique rien demande quand meme le consentement.
		fetchMock.mockResolvedValue(reply({ form: { id: 'f1', slug: 's', schema: [] } }));
		return expect(fetchPublicForm('s')).resolves.toMatchObject({ requireConsent: true });
	});

	it('echoue quand la reponse ne porte pas de formulaire', async () => {
		fetchMock.mockResolvedValue(reply({ form: { slug: 's' } }));
		await expect(fetchPublicForm('s')).rejects.toThrow(/exploitable/);
	});
});

describe('fetchForm', () => {
	it('envoie la cle de lecture, et lit un formulaire depublie', async () => {
		// C'est sa raison d'etre : la vue publique repond 404 des la depublication,
		// et la correspondance des champs doit rester etablissable ensuite.
		fetchMock.mockResolvedValue(
			reply({
				form: {
					id: 'f1',
					slug: 'enquete',
					title: 'Enquête',
					isPublished: false,
					schema: [{ key: 'champ_m3x9z1_4', type: 'radio', label: 'Priorité' }]
				}
			})
		);

		const form = await fetchForm('f1');

		expect(fetchMock.mock.calls[0]![0]).toContain('/forms/f1');
		expect(fetchMock.mock.calls[0]![1].headers.authorization).toBe('Bearer ofk_test');
		expect(form.fields[0]?.label).toBe('Priorité');
	});

	it('echoue quand la reponse ne porte pas de formulaire', async () => {
		fetchMock.mockResolvedValue(reply({ form: null }));
		await expect(fetchForm('f1')).rejects.toThrow(/exploitable/);
	});
});

describe('fetchSubmissions', () => {
	it('lit le schema et les soumissions', async () => {
		fetchMock.mockResolvedValue(
			reply({
				form: { id: 'f1', schema: [{ key: 'priorite', type: 'radio' }] },
				rows: [
					{ id: 'r1', submittedAt: '2026-07-01T10:00:00.000Z', values: { priorite: 'sante' } }
				]
			})
		);

		const { fields, submissions } = await fetchSubmissions('f1');

		expect(fields).toHaveLength(1);
		expect(submissions[0]?.id).toBe('r1');
		expect(submissions[0]?.values).toEqual({ priorite: 'sante' });
	});

	it('echoue plutot que de ranger une charge chiffree comme une reponse', async () => {
		fetchMock.mockResolvedValue(
			reply({
				form: { id: 'f1', schema: [] },
				rows: [{ id: 'r1', values: { __enc: 'base64…' } }]
			})
		);

		await expect(fetchSubmissions('f1')).rejects.toThrow(/chiffrées/);
	});

	it('ecarte une ligne sans identifiant', async () => {
		fetchMock.mockResolvedValue(
			reply({ form: { id: 'f1', schema: [] }, rows: [{ values: {} }, null] })
		);

		expect((await fetchSubmissions('f1')).submissions).toHaveLength(0);
	});

	it('echoue quand la reponse ne porte pas de formulaire', async () => {
		fetchMock.mockResolvedValue(reply({ rows: [] }));
		await expect(fetchSubmissions('f1')).rejects.toThrow(/exploitable/);
	});
});

describe('fetchSummary', () => {
	it('lit les compteurs et l activite', async () => {
		fetchMock.mockResolvedValue(
			reply({
				summary: {
					formId: 'f1',
					title: 'Enquête',
					isPublished: true,
					totalResponses: 120,
					activity: [{ date: '2026-07-01', count: 4 }, { date: '2026-07-02' }, null]
				}
			})
		);

		const summary = await fetchSummary('f1');

		expect(summary.totalResponses).toBe(120);
		expect(summary.activity).toEqual([
			{ date: '2026-07-01', count: 4 },
			{ date: '2026-07-02', count: 0 }
		]);
	});

	it('echoue quand la reponse ne porte pas de statistiques', async () => {
		fetchMock.mockResolvedValue(reply({}));
		await expect(fetchSummary('f1')).rejects.toThrow(/statistiques/);
	});
});

describe('submitResponse', () => {
	it('poste sans identite et relaie l adresse du repondant', async () => {
		// Signer la soumission avec la cle attribuerait chaque reponse au compte
		// de l'institut ; sans l'adresse relayee, le quota distant s'appliquerait
		// au serveur et non au repondant.
		fetchMock.mockResolvedValue(reply({ responseId: 'r9' }, 201));

		const id = await submitResponse({
			formId: 'f1',
			data: { priorite: 'sante' },
			consent: true,
			forwardedFor: '203.0.113.7'
		});

		const [url, init] = fetchMock.mock.calls[0]!;
		expect(url).toBe('https://forms.exemple.test/api/v1/responses/submit');
		expect(init.method).toBe('POST');
		expect(init.headers.authorization).toBeUndefined();
		expect(init.headers['x-forwarded-for']).toBe('203.0.113.7');
		expect(JSON.parse(init.body)).toEqual({
			formId: 'f1',
			data: { priorite: 'sante' },
			consent: true
		});
		expect(id).toBe('r9');
	});

	it('remonte le detail par champ d un refus de validation', async () => {
		fetchMock.mockResolvedValue(
			reply({ error: 'Réponses invalides.', details: { age: 'Trop jeune.' } }, 422)
		);

		await expect(
			submitResponse({ formId: 'f1', data: {}, consent: true })
		).rejects.toMatchObject({ status: 422, details: { age: 'Trop jeune.' } });
	});

	it('echoue si Openforms accepte sans rendre d identifiant', async () => {
		fetchMock.mockResolvedValue(reply({ success: true }, 201));
		await expect(submitResponse({ formId: 'f1', data: {}, consent: true })).rejects.toThrow(
			/identifiant/
		);
	});
});

describe('toRowSet', () => {
	const FIELDS = [
		{ key: 'priorite', type: 'radio', label: 'Priorité', required: false, options: [] },
		{ key: 'medias', type: 'checkbox', label: 'Médias', required: false, options: [] },
		{ key: 'titre', type: 'section', label: 'Section', required: false, options: [] }
	];

	it('ne retient que les champs porteurs de reponse', () => {
		const rowSet = toRowSet(FIELDS, [
			{ id: 'r1', submittedAt: new Date(), values: { priorite: 'sante', medias: ['presse'] } }
		]);

		expect(rowSet.columns).toEqual(['priorite', 'medias']);
	});

	it('aplatit chaque valeur selon son type', () => {
		const rowSet = toRowSet(FIELDS, [
			{
				id: 'r1',
				submittedAt: new Date(),
				values: { priorite: 'sante', medias: ['presse', 'radio'] }
			}
		]);

		expect(rowSet.rows[0]).toEqual({ priorite: 'sante', medias: 'presse; radio' });
	});

	it('ignore un type de champ inconnu plutot que de perdre toutes les reponses', () => {
		const rowSet = toRowSet([...FIELDS, { key: 'x', type: 'hologramme', label: 'X', required: false, options: [] }], [
			{ id: 'r1', submittedAt: new Date(), values: { priorite: 'sante' } }
		]);

		expect(rowSet.columns).not.toContain('x');
		expect(rowSet.columns).toContain('priorite');
	});

	it('rend une cellule indefinie pour une reponse absente, pas une erreur', () => {
		const rowSet = toRowSet(FIELDS, [{ id: 'r1', submittedAt: new Date(), values: {} }]);
		expect(rowSet.rows[0]).toEqual({ priorite: undefined, medias: undefined });
	});
});
