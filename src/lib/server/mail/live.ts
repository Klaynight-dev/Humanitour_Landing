/**
 * Diffusion instantanee des changements d'une boite aux ecrans ouverts.
 *
 * Un courriel recu ou un statut de remise qui change appelle `publishMailbox` ;
 * chaque ecran ouvert sur cette boite (`[boite]/evenements`) est prevenu et
 * recharge ses donnees. Le signal ne porte rien d'autre que l'identifiant de la
 * boite : le contenu se relit par les `load` habituels, donc avec le controle
 * d'acces habituel.
 *
 * En memoire, dans le processus : le site tourne dans un seul processus Node.
 * Avec plusieurs instances, un evenement n'atteindrait que les ecrans branches
 * sur la meme, et il faudrait un relais (LISTEN/NOTIFY de PostgreSQL).
 */

type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();

export function publishMailbox(mailboxId: string): void {
	for (const listener of listeners.get(mailboxId) ?? []) {
		try {
			listener();
		} catch (error) {
			console.error('[courrier] diffusion en echec', mailboxId, error);
		}
	}
}

/** S'abonne aux changements d'une boite ; rend la fonction qui se desabonne. */
export function subscribeMailbox(mailboxId: string, listener: Listener): () => void {
	const set = listeners.get(mailboxId) ?? new Set<Listener>();
	set.add(listener);
	listeners.set(mailboxId, set);

	return () => {
		set.delete(listener);
		if (set.size === 0) listeners.delete(mailboxId);
	};
}
