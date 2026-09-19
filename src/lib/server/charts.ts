import * as echarts from 'echarts';
import type { BuiltChart } from '$charts';

/**
 * Rendu des graphiques en SVG, sur le serveur.
 *
 * C est ce qui distingue cette page du tableau de bord d Openforms, qui dessine
 * le meme moteur en canvas. Ici la page est PUBLIQUE :
 *
 *   - un canvas ne contient aucun texte, donc rien a indexer et rien a lire
 *     pour un lecteur d ecran ;
 *   - un canvas n existe pas tant que le JavaScript n est pas arrive, et
 *     l explorateur doit fonctionner sans lui.
 *
 * Le SVG produit ici porte les libelles et les chiffres en vrai texte. Le
 * navigateur reprend ensuite le MEME objet d options pour rendre le graphique
 * interactif, donc l image ne change pas entre les deux.
 *
 * Ce fichier vit sous `$lib/server` : SvelteKit refuse alors de l importer cote
 * client, ce qui garantit qu ECharts ne part pas deux fois dans le paquet.
 */

/**
 * Largeur de reference du rendu serveur.
 *
 * Le SVG porte un `viewBox`, donc il s adapte a son conteneur. Cette valeur
 * fixe la taille du TEXTE par rapport au dessin : trop etroite, les libelles
 * seraient enormes sur grand ecran ; trop large, illisibles sur telephone.
 * 760 px correspond a la colonne de resultat sur un ecran d ordinateur.
 */
const REFERENCE_WIDTH = 760;

export function renderChartSvg(built: BuiltChart): string {
	const chart = echarts.init(null, null, {
		renderer: 'svg',
		ssr: true,
		width: REFERENCE_WIDTH,
		height: built.height
	});

	try {
		chart.setOption(built.option);
		return chart.renderToSVGString();
	} finally {
		// Sans liberation, chaque rendu laisse une instance derriere lui et le
		// serveur finit par les accumuler requete apres requete.
		chart.dispose();
	}
}
