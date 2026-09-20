import type { Action } from 'svelte/action';

/**
 * Retire le squelette de chargement d une image des qu elle a fini d arriver.
 *
 * L etat de base est celui du SQUELETTE, et non l inverse : une image lente
 * doit montrer son attente, et c est le seul etat que le serveur peut rendre
 * sans savoir ce qui est en cache chez le visiteur.
 *
 * Deux cas, et le second est celui qu on oublie :
 *
 * 1. L image arrive apres l hydratation : l evenement `load` suffit.
 * 2. L image etait DEJA en cache et a fini de charger avant que Svelte n attache
 *    quoi que ce soit. `load` ne se declenchera jamais, et sans le test de
 *    `complete` le squelette resterait pose derriere l image pour toujours —
 *    invisible, mais son animation continuerait de tourner sur chacune des
 *    vingt-six vignettes.
 *
 * `error` retire aussi le squelette : une image qui a echoue n arrivera pas
 * plus tard, et une attente qui ne finit jamais est un mensonge.
 *
 * Sans JavaScript, rien de tout ceci ne tourne : l image s affiche normalement
 * et le squelette reste simplement derriere elle, recouvert.
 */
export const settled: Action<HTMLImageElement, (() => void) | undefined> = (node, onSettled) => {
	let done = onSettled;

	const finish = () => done?.();

	if (node.complete) {
		finish();
	} else {
		node.addEventListener('load', finish, { once: true });
		node.addEventListener('error', finish, { once: true });
	}

	return {
		update(next) {
			done = next;
		},
		destroy() {
			node.removeEventListener('load', finish);
			node.removeEventListener('error', finish);
		}
	};
};
