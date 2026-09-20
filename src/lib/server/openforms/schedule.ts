import { env } from '$env/dynamic/private';
import { isConfigured } from './client';
import { syncOpenSurveys } from './sync';

/**
 * Minuterie de synchronisation.
 *
 * Le webhook couvre le cas courant : une reponse arrive, elle est reprise dans
 * la seconde. Cette minuterie couvre tout le reste — une notification perdue,
 * une panne reseau passagere, une reponse corrigee dans le tableur d'Openforms,
 * une instance redemarree pendant une soumission. Sans elle, un miroir peut
 * diverger indefiniment sans que rien ne l'indique.
 *
 * Elle ne tourne QUE sur les enquetes reliees a un formulaire ouvert : une
 * enquete close ne recevra plus rien, la reinterroger chargerait Openforms pour
 * rien.
 *
 * `setInterval` et non une file de taches : a l'echelle du projet — quelques
 * enquetes, une instance — ajouter un ordonnanceur serait de la complexite
 * gratuite (AGENTS.md section 1.6). Le jour ou plusieurs instances tournent de
 * front, il faudra un verrou partage, et ce sera le moment de changer.
 */

const DEFAULT_MINUTES = 15;

/** Repere de l'intervalle en cours, pour ne jamais en demarrer deux. */
let timer: ReturnType<typeof setInterval> | null = null;

/** Vrai tant qu'une passe est en vol, pour ne pas en empiler une seconde. */
let running = false;

/**
 * Periode en minutes, lue dans l'environnement.
 *
 * `0` arrete la minuterie : c'est le reglage attendu en developpement, ou
 * interroger une instance de production toutes les quinze minutes n'a aucun
 * interet. Une valeur illisible retombe sur le defaut plutot que de desactiver
 * la reprise en silence.
 */
export function intervalMinutes(): number {
	const raw = env.OPENFORMS_SYNC_MINUTES?.trim();
	if (raw === undefined || raw === '') return DEFAULT_MINUTES;

	const parsed = Number(raw);
	if (!Number.isFinite(parsed) || parsed < 0) {
		console.warn(
			`[openforms] OPENFORMS_SYNC_MINUTES illisible (« ${raw} »), repli sur ${DEFAULT_MINUTES} minutes.`
		);
		return DEFAULT_MINUTES;
	}

	return Math.floor(parsed);
}

/**
 * Une passe, protegee contre le recouvrement.
 *
 * Si une synchronisation dure plus longtemps que la periode — Openforms lent,
 * gros volume — la suivante est SAUTEE et non mise en attente. Les empiler
 * ferait grossir la file sans jamais la resorber, et la passe suivante fera de
 * toute facon le travail des deux : elle lit l'etat complet, pas un delta.
 */
async function tick(): Promise<void> {
	if (running) {
		console.warn('[openforms] passe precedente encore en cours, tour saute.');
		return;
	}

	running = true;
	try {
		const outcomes = await syncOpenSurveys('SCHEDULED');
		const created = outcomes.reduce((total, outcome) => total + outcome.created, 0);
		const failed = outcomes.filter((outcome) => outcome.failure).length;

		// Journalise seulement ce qui merite d'etre lu : une passe silencieuse
		// toutes les quinze minutes noierait les incidents.
		if (created > 0 || failed > 0) {
			console.warn(`[openforms] passe planifiee : ${created} reprise(s), ${failed} echec(s).`);
		}
	} finally {
		running = false;
	}
}

/**
 * Demarre la minuterie, une seule fois par processus.
 *
 * Appelee depuis `hooks.server.ts`. Elle n'attend pas la premiere periode : une
 * instance qui vient de redemarrer a justement des chances d'avoir manque des
 * notifications.
 */
export function startSyncSchedule(): void {
	if (timer) return;

	if (!isConfigured()) {
		console.warn('[openforms] connecteur non configure : aucune synchronisation planifiee.');
		return;
	}

	const minutes = intervalMinutes();
	if (minutes === 0) {
		console.warn('[openforms] synchronisation planifiee desactivee (OPENFORMS_SYNC_MINUTES=0).');
		return;
	}

	// `unref` : la minuterie ne doit pas retenir le processus a l'arret. Sans
	// cela, un conteneur mettrait jusqu'a quinze minutes a s'eteindre.
	timer = setInterval(() => void tick(), minutes * 60_000);
	timer.unref?.();

	void tick();

	console.warn(`[openforms] synchronisation planifiee toutes les ${minutes} minutes.`);
}
