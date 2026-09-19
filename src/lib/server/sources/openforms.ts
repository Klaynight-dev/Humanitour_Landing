import { env } from '$env/dynamic/private';
import type { RowSet } from '../import/types';
import {
	SourceError,
	type DataSource,
	type RemoteField,
	type SkippedField,
	type SourceResult
} from './types';

/**
 * Connecteur vers Openforms, l outil de formulaires de l association
 * (`forms.humanitour.fr`, depot `Klaynight/Openforms`, MIT).
 *
 * C est la source annoncee par la decision 3 de `CLAUDE.md`.
 *
 * AUTHENTIFICATION : cle d API porteuse, prefixee `ofk_`. Openforms n en
 * conserve que le SHA-256 et la resout exactement comme une session, donc une
 * cle vaut les droits de l utilisateur qui l a creee. Elle doit donc appartenir
 * a un compte qui ne voit QUE les formulaires de l enquete.
 *
 * UN SEUL APPEL suffit pour un formulaire : `GET /responses/form/:id` renvoie a
 * la fois le schema et toutes les lignes, deja dechiffrees cote serveur quand
 * le formulaire est chiffre au repos.
 */

const PREFIXE_CLE = 'ofk_';

/**
 * Correspondance des types de champ Openforms vers les types de question
 * Humanitour (`src/lib/shared/questions/`).
 *
 * Ce qui n est pas dans cette table n est pas importe, et c est deliberé :
 * mieux vaut un champ absent et signale qu un champ range de force dans un type
 * qui ne lui va pas, ce qui fausserait tous les croisements qui l emploient.
 */
const TYPES: Readonly<Record<string, string>> = {
	short_text: 'free_text',
	paragraph: 'free_text',
	text: 'free_text',
	radio: 'single_choice',
	select: 'single_choice',
	checkbox: 'multiple_choice',
	linear_scale: 'scale',
	number: 'number'
};

/**
 * Types de champ intrinsequement identifiants.
 *
 * Ils sont ecartes AVANT de construire le tableau, donc la donnee ne traverse
 * jamais la frontiere. L association collecte des opinions politiques, une
 * donnee sensible au sens de l article 9 : un courriel a cote suffirait a
 * reidentifier le repondant (`AGENTS.md` section 4).
 */
const IDENTIFIANTS: Readonly<Record<string, string>> = {
	email: 'adresse de courriel',
	address: 'adresse postale',
	signature: 'signature manuscrite',
	file: 'fichier deposé'
};

/**
 * Types qui ne portent aucune reponse : mise en page, paiement, calcul.
 * Les ecarter n est pas une perte, il n y a rien a compter dedans.
 */
const NON_DONNEES = new Set([
	'section',
	'text_block',
	'footer',
	'formula',
	'stripe_payment',
	'grid',
	'checkbox_grid',
	'date',
	'datetime'
]);

interface ChampDistant {
	key?: unknown;
	type?: unknown;
	label?: unknown;
	options?: unknown;
}

interface LigneDistante {
	id?: unknown;
	submittedAt?: unknown;
	values?: unknown;
}

function base(): string {
	const url = env.OPENFORMS_URL?.trim();
	if (!url) throw new SourceError('openforms', "OPENFORMS_URL n'est pas configurée.");
	return url.replace(/\/+$/, '');
}

function cle(): string {
	const token = env.OPENFORMS_API_KEY?.trim();
	if (!token) throw new SourceError('openforms', "OPENFORMS_API_KEY n'est pas configurée.");
	if (!token.startsWith(PREFIXE_CLE)) {
		throw new SourceError(
			'openforms',
			`OPENFORMS_API_KEY ne ressemble pas à une clé Openforms : elle doit commencer par « ${PREFIXE_CLE} ».`
		);
	}
	return token;
}

async function appeler<T>(chemin: string): Promise<T> {
	/*
	 * La configuration est resolue AVANT le `try`. Lue a l interieur, une cle mal
	 * prefixee levait son erreur dans le bloc, et le `catch` la rendait en
	 * « Openforms est injoignable » : l operateur serait parti chercher une panne
	 * reseau devant un probleme de configuration.
	 */
	const cible = `${base()}/api/v1${chemin}`;
	const jeton = cle();

	let reponse: Response;
	try {
		reponse = await fetch(cible, {
			headers: { authorization: `Bearer ${jeton}`, accept: 'application/json' }
		});
	} catch (cause) {
		// La cause reste attachee : sans elle, un certificat expire et une panne
		// DNS donneraient le meme message dans les journaux.
		const erreur = new SourceError('openforms', `Openforms est injoignable (${cible}).`);
		erreur.cause = cause;
		throw erreur;
	}

	if (!reponse.ok) {
		// Le message d Openforms est en francais et destine a un humain : on le
		// relaie tel quel plutot que d inventer une paraphrase.
		const detail = await reponse
			.json()
			.then((corps: { error?: string }) => corps?.error)
			.catch(() => undefined);
		throw new SourceError(
			'openforms',
			detail ?? `Openforms a répondu ${reponse.status}.`,
			reponse.status
		);
	}

	return (await reponse.json()) as T;
}

/** Traduit un champ Openforms, ou dit pourquoi il est ecarte. */
function traduire(champ: ChampDistant): RemoteField | SkippedField {
	const key = typeof champ.key === 'string' ? champ.key : '';
	const remoteType = typeof champ.type === 'string' ? champ.type : 'inconnu';
	const label = typeof champ.label === 'string' && champ.label ? champ.label : key;

	if (!key) {
		return {
			key: '(sans clé)',
			label,
			remoteType,
			reason: "le champ n'a pas de clé exploitable",
			identifying: false
		};
	}

	const identifiant = IDENTIFIANTS[remoteType];
	if (identifiant) {
		return {
			key,
			label,
			remoteType,
			reason: `donnée directement identifiante (${identifiant}) : elle n'entre pas`,
			identifying: true
		};
	}

	if (NON_DONNEES.has(remoteType)) {
		return {
			key,
			label,
			remoteType,
			reason: 'ce type de champ ne porte pas de réponse à compter',
			identifying: false
		};
	}

	const questionType = TYPES[remoteType];
	if (!questionType) {
		return {
			key,
			label,
			remoteType,
			reason: `aucun type de question Humanitour ne correspond à « ${remoteType} »`,
			identifying: false
		};
	}

	return { key, label, remoteType, questionType, options: lireOptions(champ.options) };
}

function lireOptions(brut: unknown): readonly { code: string; label: string }[] {
	if (!Array.isArray(brut)) return [];

	return brut.flatMap((option) => {
		// Openforms accepte deux ecritures : une chaine, ou un objet etiquete.
		if (typeof option === 'string') return [{ code: option, label: option }];
		if (option && typeof option === 'object') {
			const objet = option as { value?: unknown; label?: unknown };
			const code = typeof objet.value === 'string' ? objet.value : undefined;
			if (!code) return [];
			return [{ code, label: typeof objet.label === 'string' ? objet.label : code }];
		}
		return [];
	});
}

function estEcarte(champ: RemoteField | SkippedField): champ is SkippedField {
	return 'reason' in champ;
}

/**
 * Aplatit une valeur Openforms en quelque chose que les types de question
 * savent normaliser. Un choix multiple arrive en tableau : on le rend en liste
 * separee par des points-virgules, la convention deja employee par l import de
 * fichiers.
 */
function aplatir(valeur: unknown): unknown {
	if (Array.isArray(valeur)) return valeur.map((element) => String(element)).join('; ');
	if (valeur && typeof valeur === 'object') return JSON.stringify(valeur);
	return valeur;
}

export const openforms: DataSource = {
	key: 'openforms',
	label: 'Openforms (forms.humanitour.fr)',

	isConfigured() {
		return Boolean(env.OPENFORMS_URL?.trim() && env.OPENFORMS_API_KEY?.trim());
	},

	async listForms() {
		const corps = await appeler<{ forms?: { id: string; title: string }[] }>('/forms');
		return (corps.forms ?? []).map((form) => ({ id: form.id, title: form.title }));
	},

	async fetchForm(formId: string): Promise<SourceResult> {
		const corps = await appeler<{
			form?: { id?: string; title?: string; schema?: unknown };
			rows?: LigneDistante[];
		}>(`/responses/form/${encodeURIComponent(formId)}`);

		const distant = corps.form;
		if (!distant?.id) {
			throw new SourceError('openforms', "Openforms n'a pas renvoyé de formulaire exploitable.");
		}

		const schema = Array.isArray(distant.schema) ? (distant.schema as ChampDistant[]) : [];
		const traduits = schema.map(traduire);
		const fields = traduits.filter((champ): champ is RemoteField => !estEcarte(champ));
		const skipped = traduits.filter(estEcarte);

		const lignes = Array.isArray(corps.rows) ? corps.rows : [];

		/*
		 * Chiffrement au repos : Openforms dechiffre cote serveur avant de
		 * repondre. Si la charge arrive encore scellee, c est que la cle de
		 * l instance manque. Mieux vaut echouer que ranger « __enc » comme une
		 * reponse de plus.
		 */
		const scellee = lignes.find(
			(ligne) =>
				ligne.values && typeof ligne.values === 'object' && '__enc' in (ligne.values as object)
		);
		if (scellee) {
			throw new SourceError(
				'openforms',
				"Les réponses arrivent chiffrées : l'instance Openforms n'a pas pu les déchiffrer. Vérifiez sa clé de chiffrement avant de réimporter."
			);
		}

		const columns = fields.map((champ) => champ.key);
		const rows = lignes.map((ligne) => {
			const valeurs = (ligne.values ?? {}) as Record<string, unknown>;
			const sortie: Record<string, unknown> = {};
			for (const champ of fields) sortie[champ.key] = aplatir(valeurs[champ.key]);
			return sortie;
		});

		const rowSet: RowSet = { columns, rows };

		return {
			form: { id: distant.id, title: distant.title ?? distant.id, fields },
			rowSet,
			skipped,
			submissions: lignes.length
		};
	}
};
