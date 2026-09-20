import type { ChoiceOption, ContentField } from '../fields';

/**
 * Les reglages de mise en page communs a toutes les sections.
 *
 * Ils existent parce que l'alternative est pire : sans eux, « la meme section
 * en noir » deviendrait un second type de section, et la bibliotheque
 * compterait trois fois trop d'entrees qui ne different que par une couleur.
 *
 * Ce qui est offert au choix est ferme, et c'est le point : ce sont les cinq
 * surfaces de la charte, pas un selecteur de couleur libre. Une surface hors
 * charte casserait les contrastes verifies dans DESIGN.md, et personne ne s'en
 * apercevrait avant la mise en ligne.
 */

/** Les cinq surfaces de la charte. La cle est stockee, jamais la classe CSS. */
export const SURFACE_KEYS = ['paper', 'cream', 'ink', 'mesh', 'brand'] as const;
export type SurfaceKey = (typeof SURFACE_KEYS)[number];

const SURFACE_OPTIONS: readonly ChoiceOption[] = [
	{ value: 'paper', label: 'Blanc' },
	{ value: 'cream', label: 'Crème' },
	{ value: 'ink', label: 'Noir' },
	{ value: 'mesh', label: 'Dégradé doux' },
	{ value: 'brand', label: 'Dégradé de marque' }
];

export function surfaceField(fallback: SurfaceKey): ContentField {
	return {
		name: 'surface',
		label: 'Fond de la section',
		help: 'Le noir et les deux dégradés portent leur propre couleur de texte : rien à régler.',
		type: 'choice',
		required: false,
		options: SURFACE_OPTIONS,
		fallback
	};
}

/**
 * Hauteur de respiration.
 *
 * Trois hauteurs, plus un cas a part : « suite » colle la section a celle du
 * dessus et pose un filet entre les deux. C'est ce qui permet de lire deux
 * sections de meme fond comme un seul bloc — la couverture de l'accueil et le
 * tableau des ecarts, par exemple — au lieu de deux bandes empilees.
 */
export const SPACING_KEYS = ['suite', 'compact', 'normal', 'ample'] as const;
export type SpacingKey = (typeof SPACING_KEYS)[number];

export function spacingField(fallback: SpacingKey = 'normal'): ContentField {
	return {
		name: 'spacing',
		label: 'Hauteur de la section',
		type: 'choice',
		required: false,
		options: [
			{ value: 'suite', label: 'Enchaîne la section précédente' },
			{ value: 'compact', label: 'Resserrée' },
			{ value: 'normal', label: 'Normale' },
			{ value: 'ample', label: 'Aérée' }
		],
		fallback
	};
}

/**
 * Les aplats organiques de la charte.
 *
 * Une section par page les porte, toujours sur creme, toujours aux memes deux
 * coins (`app.css`). Le champ est donc un oui/non, pas une position : laisser
 * choisir l'emplacement reviendrait a laisser defaire la regle.
 */
export function shapesField(): ContentField {
	return {
		name: 'shapes',
		label: 'Aplats colorés dans les marges',
		help: 'Une seule section par page devrait les porter, et sur fond crème.',
		type: 'choice',
		required: false,
		options: [
			{ value: 'non', label: 'Sans' },
			{ value: 'oui', label: 'Avec' }
		],
		fallback: 'non'
	};
}

/**
 * Le mot surligne d'un titre.
 *
 * La charte pose une etiquette de travers sur UN mot du titre. Plutot que de
 * laisser saisir du HTML dans le titre — ce que le modele de contenu interdit
 * par construction —, on saisit le titre en clair et le mot a surligner
 * separement : le rendu retrouve le mot dans la phrase. Un mot absent du titre
 * ne surligne rien et ne casse rien.
 */
export function highlightFields(): readonly ContentField[] {
	return [
		{
			name: 'highlight',
			label: 'Mot mis en avant',
			help: 'Un mot du titre, repris tel quel. Il reçoit l’étiquette de la charte.',
			type: 'text',
			required: false
		},
		{
			name: 'highlightStyle',
			label: 'Style du mot mis en avant',
			type: 'choice',
			required: false,
			options: [
				{ value: 'brand', label: 'Étiquette dégradée' },
				{ value: 'ink', label: 'Étiquette noire' }
			],
			fallback: 'brand'
		}
	];
}

/** Les cinq formes de bouton du site. Memes variantes que `Button.svelte`. */
export const BUTTON_VARIANTS = ['primary', 'brand', 'outline', 'inverse', 'ghost'] as const;
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

/**
 * Une rangee de boutons.
 *
 * `href` est obligatoire des qu'un libelle est saisi : un bouton qui ne mene
 * nulle part est une promesse non tenue, et c'est le genre d'oubli qui ne se
 * voit qu'une fois la page en ligne.
 */
export function buttonsField(label = 'Boutons'): ContentField {
	return {
		name: 'buttons',
		label,
		type: 'list',
		required: false,
		itemLabel: 'un bouton',
		max: 4,
		item: [
			{ name: 'label', label: 'Libellé', type: 'text', required: true },
			{
				name: 'href',
				label: 'Adresse',
				help: 'Une page du site (/donnees) ou une adresse complète (https://…).',
				type: 'url',
				required: true
			},
			{
				name: 'variant',
				label: 'Apparence',
				type: 'choice',
				required: false,
				options: [
					{ value: 'primary', label: 'Plein noir' },
					{ value: 'brand', label: 'Dégradé de marque' },
					{ value: 'outline', label: 'Contour noir' },
					{ value: 'inverse', label: 'Contour clair (sur fond noir)' },
					{ value: 'ghost', label: 'Lien souligné' }
				],
				fallback: 'primary'
			}
		]
	};
}

/** Titre de section. Facultatif partout : une section peut n'etre que du texte. */
export function titleField(required = false): ContentField {
	return { name: 'title', label: 'Titre', type: 'text', required };
}

export function introField(label = 'Chapô', required = false): ContentField {
	return {
		name: 'intro',
		label,
		help: 'Une ou deux phrases sous le titre.',
		type: 'textarea',
		required
	};
}
