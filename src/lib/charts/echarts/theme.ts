/**
 * Habillage ECharts d Humanitour.
 *
 * ECharts est le moteur de graphiques de `forms.humanitour.fr` (`echarts@6`),
 * et c est pour cette raison qu il est ici : une seule bibliotheque a maitriser
 * pour les deux applications de l association.
 *
 * DEUX ECARTS ASSUMES avec l usage qu en fait Openforms, et ils viennent tous
 * les deux du fait que cette page-ci est PUBLIQUE :
 *
 *   1. Rendu SVG, pas canvas. Openforms dessine dans un back-office : personne
 *      n indexe ses graphiques et personne ne les lit au lecteur d ecran. Ici,
 *      le SVG est produit cote serveur, donc les libelles et les chiffres sont
 *      du vrai texte, presents avant tout JavaScript.
 *   2. Aucune animation. Le registre « chiffres » est a MOTION 1 : les
 *      apparitions au chargement d ECharts sont desactivees d office.
 *
 * Les couleurs ne sont pas choisies ici : elles viennent de `palette.ts`, qui
 * les a fait valider (bande de clarte, plancher de chroma, separation
 * daltonienne). Ce fichier ne fait que les presenter a ECharts.
 */

/** Meme pile que `--font-sans` dans `app.css`. */
const FONT_SANS = "'Jost Variable', ui-sans-serif, system-ui, sans-serif";
/** Meme pile que `--font-mono` : les chiffres se lisent en chasse fixe. */
const FONT_MONO = "'JetBrains Mono Variable', ui-monospace, monospace";

/** Encre, et gris de libelle. Verifies : #6b6360 sur blanc donne 5,87:1. */
const INK = '#000000';
const MUTED = '#6b6360';
/** Trait de structure : assez visible pour guider, assez discret pour s effacer. */
const RULE = '#dcd8d6';

export const CHART_FONTS = { sans: FONT_SANS, mono: FONT_MONO } as const;
export const CHART_INK = INK;
export const CHART_MUTED = MUTED;

/**
 * Base commune a tous les graphiques.
 *
 * Fusionnee en tete de chaque option : un graphique n a plus qu a decrire SES
 * donnees, jamais sa typographie ni ses axes.
 */
export function chartBase() {
	return {
		// MOTION 1 : aucune apparition, aucune transition d entree. Un graphique
		// qui se dessine tout seul attire l oeil sur son animation plutot que sur
		// ce qu il mesure.
		animation: false,
		textStyle: { fontFamily: FONT_SANS, color: INK },
		grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
		tooltip: {
			trigger: 'item' as const,
			backgroundColor: '#ffffff',
			borderColor: RULE,
			borderWidth: 1,
			padding: [8, 10] as [number, number],
			textStyle: { color: INK, fontFamily: FONT_SANS, fontSize: 13 },
			// Le registre « chiffres » ne porte aucune ombre, infobulle comprise.
			extraCssText: 'box-shadow:none;border-radius:10px;'
		}
	};
}

/** Axe de valeurs : la grille se lit, elle ne se regarde pas. */
export function valueAxis(options: { max?: number; percent?: boolean } = {}) {
	return {
		type: 'value' as const,
		max: options.max,
		axisLine: { show: false },
		axisTick: { show: false },
		splitLine: { lineStyle: { color: RULE, type: 'solid' as const } },
		axisLabel: {
			color: MUTED,
			fontFamily: FONT_MONO,
			fontSize: 11,
			formatter: options.percent ? '{value} %' : '{value}'
		}
	};
}

/** Axe de modalites. Les libelles sont du texte, jamais tronques en silence. */
export function categoryAxis(labels: readonly string[]) {
	return {
		type: 'category' as const,
		data: [...labels],
		axisLine: { lineStyle: { color: RULE } },
		axisTick: { show: false },
		axisLabel: { color: INK, fontFamily: FONT_SANS, fontSize: 12, width: 160, overflow: 'break' }
	};
}

/**
 * Etiquette posee au bout d une barre.
 *
 * C est l etiquetage direct : la valeur contre la forme qu elle mesure, plutot
 * qu une legende a dechiffrer a cote. Elle rend aussi le graphique lisible
 * quand la couleur ne passe pas, ce que la palette impose (`palette.ts`).
 *
 * AUCUN gabarit de formatage ici, volontairement. Les gabarits d ECharts
 * (« {c} ») ecrivent les nombres a l anglaise : « 30.4 » la ou tout le reste du
 * site ecrit « 30,4 % ». Chaque donnee porte donc son libelle deja compose par
 * `shared/format.ts`, seule implementation du formatage des chiffres publies.
 */
export function endLabel() {
	return {
		show: true,
		position: 'right' as const,
		color: INK,
		fontFamily: FONT_MONO,
		fontSize: 12,
		fontWeight: 600 as const
	};
}
