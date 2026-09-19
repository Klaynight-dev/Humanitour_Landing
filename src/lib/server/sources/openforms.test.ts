import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Les variables d environnement sont lues a l APPEL, pas au chargement du
 * module : on peut donc les poser avant chaque test. Le mock doit toutefois
 * exister avant l import du connecteur, d ou `vi.mock` en tete de fichier.
 */
const env: Record<string, string | undefined> = {};

vi.mock('$env/dynamic/private', () => ({ env }));

const { openforms } = await import('./openforms');
const { SourceError } = await import('./types');

/** Reponse d Openforms telle que `GET /responses/form/:id` la renvoie. */
function repondre(corps: unknown, status = 200) {
	return vi.fn().mockResolvedValue({
		ok: status >= 200 && status < 300,
		status,
		json: async () => corps
	} as unknown as Response);
}

const SCHEMA = [
	{ key: 'priorite', type: 'radio', label: 'Votre priorité ?', options: ['sante', 'ecologie'] },
	{
		key: 'medias',
		type: 'checkbox',
		label: 'Quels médias ?',
		options: [
			{ value: 'tv', label: 'Télévision' },
			{ value: 'web', label: 'En ligne' }
		]
	},
	{ key: 'confiance', type: 'linear_scale', label: 'Confiance' },
	{ key: 'age', type: 'number', label: 'Âge' },
	{ key: 'remarque', type: 'paragraph', label: 'Remarque libre' },
	{ key: 'courriel', type: 'email', label: 'Votre courriel' },
	{ key: 'titre', type: 'text_block', label: 'Merci de répondre' },
	{ key: 'photo', type: 'file', label: 'Une photo' },
	{ key: 'exotique', type: 'stripe_payment', label: 'Paiement' }
];

const LIGNES = [
	{
		id: 'r1',
		submittedAt: '2026-08-01T10:00:00.000Z',
		values: {
			priorite: 'sante',
			medias: ['tv', 'web'],
			confiance: 4,
			age: 37,
			remarque: 'rien à signaler',
			courriel: 'quelquun@example.org'
		}
	}
];

beforeEach(() => {
	for (const key of Object.keys(env)) delete env[key];
	env.OPENFORMS_URL = 'https://forms.humanitour.fr';
	env.OPENFORMS_API_KEY = 'ofk_test';
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('configuration', () => {
	it('se declare configure quand url et cle sont presentes', () => {
		expect(openforms.isConfigured()).toBe(true);
	});

	it('se declare non configure sans cle', () => {
		delete env.OPENFORMS_API_KEY;
		expect(openforms.isConfigured()).toBe(false);
	});

	it('refuse une cle qui ne porte pas le prefixe Openforms', async () => {
		env.OPENFORMS_API_KEY = 'un-jeton-quelconque';
		vi.stubGlobal('fetch', repondre({}));
		await expect(openforms.fetchForm('f1')).rejects.toThrow(/ofk_/);
	});

	it('refuse une URL absente', async () => {
		delete env.OPENFORMS_URL;
		vi.stubGlobal('fetch', repondre({}));
		await expect(openforms.fetchForm('f1')).rejects.toBeInstanceOf(SourceError);
	});
});

describe('appel', () => {
	it('porte la cle en Bearer sur le bon chemin', async () => {
		const appel = repondre({ form: { id: 'f1', title: 'Test', schema: [] }, rows: [] });
		vi.stubGlobal('fetch', appel);

		await openforms.fetchForm('f1');

		const appelFait = appel.mock.calls.at(0);
		expect(appelFait).toBeDefined();
		expect(appelFait?.[0]).toBe('https://forms.humanitour.fr/api/v1/responses/form/f1');
		expect((appelFait?.[1] as RequestInit).headers).toMatchObject({
			authorization: 'Bearer ofk_test'
		});
	});

	it('echappe l identifiant du formulaire', async () => {
		const appel = repondre({ form: { id: 'a/b', title: 'T', schema: [] }, rows: [] });
		vi.stubGlobal('fetch', appel);

		await openforms.fetchForm('a/b');

		expect(appel.mock.calls.at(0)?.[0]).toContain('/responses/form/a%2Fb');
	});

	it("relaie le message d'erreur d'Openforms", async () => {
		vi.stubGlobal('fetch', repondre({ success: false, error: 'Accès refusé.' }, 403));
		await expect(openforms.fetchForm('f1')).rejects.toThrow('Accès refusé.');
	});

	it('signale une instance injoignable', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
		);
		await expect(openforms.fetchForm('f1')).rejects.toThrow(/injoignable/);
	});
});

describe('traduction du schema', () => {
	it('retient les champs qui ont un type de question correspondant', async () => {
		vi.stubGlobal('fetch', repondre({ form: { id: 'f1', title: 'T', schema: SCHEMA }, rows: [] }));

		const { form } = await openforms.fetchForm('f1');

		expect(form.fields.map((champ) => [champ.key, champ.questionType])).toEqual([
			['priorite', 'single_choice'],
			['medias', 'multiple_choice'],
			['confiance', 'scale'],
			['age', 'number'],
			['remarque', 'free_text']
		]);
	});

	it('lit les options ecrites en chaine comme en objet', async () => {
		vi.stubGlobal('fetch', repondre({ form: { id: 'f1', title: 'T', schema: SCHEMA }, rows: [] }));

		const { form } = await openforms.fetchForm('f1');

		expect(form.fields.at(0)?.options).toEqual([
			{ code: 'sante', label: 'sante' },
			{ code: 'ecologie', label: 'ecologie' }
		]);
		expect(form.fields.at(1)?.options).toEqual([
			{ code: 'tv', label: 'Télévision' },
			{ code: 'web', label: 'En ligne' }
		]);
	});

	it('ecarte les champs identifiants en le signalant', async () => {
		vi.stubGlobal('fetch', repondre({ form: { id: 'f1', title: 'T', schema: SCHEMA }, rows: [] }));

		const { skipped } = await openforms.fetchForm('f1');
		const identifiants = skipped.filter((champ) => champ.identifying);

		expect(identifiants.map((champ) => champ.key)).toEqual(['courriel', 'photo']);
		expect(identifiants.at(0)?.reason).toMatch(/identifiante/);
	});

	it('ecarte la mise en page et les types sans correspondance, sans les marquer identifiants', async () => {
		vi.stubGlobal('fetch', repondre({ form: { id: 'f1', title: 'T', schema: SCHEMA }, rows: [] }));

		const { skipped } = await openforms.fetchForm('f1');
		const autres = skipped.filter((champ) => !champ.identifying);

		expect(autres.map((champ) => champ.key).sort()).toEqual(['exotique', 'titre']);
	});
});

describe('lignes', () => {
	it('ne construit des colonnes que pour les champs retenus', async () => {
		vi.stubGlobal(
			'fetch',
			repondre({ form: { id: 'f1', title: 'T', schema: SCHEMA }, rows: LIGNES })
		);

		const { rowSet } = await openforms.fetchForm('f1');

		expect(rowSet.columns).toEqual(['priorite', 'medias', 'confiance', 'age', 'remarque']);
	});

	it("ne laisse aucune valeur identifiante entrer dans le tableau", async () => {
		vi.stubGlobal(
			'fetch',
			repondre({ form: { id: 'f1', title: 'T', schema: SCHEMA }, rows: LIGNES })
		);

		const { rowSet } = await openforms.fetchForm('f1');

		expect(Object.keys(rowSet.rows.at(0) ?? {})).not.toContain('courriel');
		expect(JSON.stringify(rowSet.rows)).not.toContain('example.org');
	});

	it('aplatit un choix multiple en liste separee par des points-virgules', async () => {
		vi.stubGlobal(
			'fetch',
			repondre({ form: { id: 'f1', title: 'T', schema: SCHEMA }, rows: LIGNES })
		);

		const { rowSet } = await openforms.fetchForm('f1');

		expect(rowSet.rows.at(0)?.medias).toBe('tv; web');
	});

	it('compte les soumissions avant exclusion', async () => {
		vi.stubGlobal(
			'fetch',
			repondre({ form: { id: 'f1', title: 'T', schema: SCHEMA }, rows: LIGNES })
		);

		const { submissions } = await openforms.fetchForm('f1');

		expect(submissions).toBe(1);
	});

	it('echoue si les reponses arrivent encore chiffrees', async () => {
		vi.stubGlobal(
			'fetch',
			repondre({
				form: { id: 'f1', title: 'T', schema: SCHEMA },
				rows: [{ id: 'r1', values: { __enc: 'ZmFrZQ==' } }]
			})
		);

		await expect(openforms.fetchForm('f1')).rejects.toThrow(/chiffrées/);
	});

	it('refuse une reponse sans formulaire exploitable', async () => {
		vi.stubGlobal('fetch', repondre({ rows: [] }));
		await expect(openforms.fetchForm('f1')).rejects.toThrow(/exploitable/);
	});
});

describe('liste des formulaires', () => {
	it('rend les formulaires accessibles a la cle', async () => {
		vi.stubGlobal(
			'fetch',
			repondre({ forms: [{ id: 'f1', title: 'Présidentielle 2027', extra: 'ignoré' }] })
		);

		await expect(openforms.listForms()).resolves.toEqual([
			{ id: 'f1', title: 'Présidentielle 2027' }
		]);
	});

	it('tolere une reponse sans liste', async () => {
		vi.stubGlobal('fetch', repondre({}));
		await expect(openforms.listForms()).resolves.toEqual([]);
	});
});
