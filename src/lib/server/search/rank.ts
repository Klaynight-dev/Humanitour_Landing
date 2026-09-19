/**
 * Classement des resultats de la recherche transverse.
 *
 * Fonction pure, separee des requetes Prisma : c'est la regle de tri qui merite
 * d'etre verifiee, et elle doit l'etre sans PostgreSQL (AGENTS.md section 3).
 */

export interface SearchHit {
	/** Domaine d'origine, tel qu'il s'affiche dans la liste de resultats. */
	readonly kind: 'survey' | 'media' | 'user';
	readonly id: string;
	readonly title: string;
	readonly subtitle: string;
	readonly href: string;
	/** Date de derniere modification, pour departager a pertinence egale. */
	readonly updatedAt: Date;
}

/**
 * Pertinence d'un resultat pour une requete.
 *
 * Trois paliers seulement, et aucun calcul de distance : sur quelques centaines
 * d'enregistrements, « le titre commence par ce que j'ai tape » suffit a mettre
 * la bonne ligne en tete. Un moteur de score elabore serait du reglage a
 * l'aveugle.
 */
export function score(hit: SearchHit, query: string): number {
	const title = hit.title.toLowerCase();
	const needle = query.trim().toLowerCase();

	if (needle === '') return 0;
	if (title === needle) return 3;
	if (title.startsWith(needle)) return 2;
	if (title.includes(needle)) return 1;
	return 0;
}

/**
 * Fusionne les resultats des differents domaines en une seule liste.
 *
 * Le tri est stable et totalement ordonne : pertinence, puis date, puis titre.
 * Sans le dernier critere, deux enregistrements crees dans la meme transaction
 * changeraient de place d'un affichage a l'autre.
 */
export function rank(hits: readonly SearchHit[], query: string, limit: number): SearchHit[] {
	return [...hits]
		.sort((a, b) => {
			const byScore = score(b, query) - score(a, query);
			if (byScore !== 0) return byScore;

			const byDate = b.updatedAt.getTime() - a.updatedAt.getTime();
			if (byDate !== 0) return byDate;

			return a.title.localeCompare(b.title, 'fr');
		})
		.slice(0, limit);
}
