import type { Action } from 'svelte/action';

/**
 * Apparition au defilement, jouee une seule fois par element.
 *
 * MOTION 2 (DESIGN.md) : le geste n est pas pose sur toute la page, seulement
 * sur les deux moments ou l arrivee dit quelque chose, la photo de terrain et
 * les portraits de l equipe. Un `fade up` generalise est precisement le tell
 * que `antislop` rejette.
 *
 * Trois garde-fous :
 *
 * 1. L etat de base du DOM est l etat final. `data-reveal` n est pose que par
 *    cette action, donc sans JavaScript rien n est masque.
 * 2. `prefers-reduced-motion` coupe l action avant toute ecriture : l element
 *    n entre jamais dans l etat `pending`.
 * 3. L observateur se detache des la premiere apparition. Aucune boucle, aucun
 *    recalcul au defilement suivant.
 *
 * Le parametre est le retard en millisecondes, pour echelonner une serie.
 */
export const reveal: Action<HTMLElement, number | undefined> = (node, delay = 0) => {
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

	node.dataset.reveal = 'pending';
	node.style.setProperty('--reveal-delay', `${delay}ms`);

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				node.dataset.reveal = 'shown';
				observer.unobserve(entry.target);
			}
		},
		// Le bas du viewport est exclu : l element entre quand il est reellement
		// entre dans la zone de lecture, pas au premier pixel visible.
		{ rootMargin: '0px 0px -15% 0px', threshold: 0.1 }
	);

	observer.observe(node);

	return {
		destroy() {
			observer.disconnect();
		}
	};
};
