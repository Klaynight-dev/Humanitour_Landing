import {
	BUTTON_VARIANTS,
	type ButtonVariant,
	type SpacingKey,
	type SurfaceKey
} from '$lib/shared/content/blocks/common';

/**
 * Les classes de mise en page des sections.
 *
 * Les cles vivent dans `shared/`, les classes ici : une cle est une donnee
 * stockee en base, une classe est de la presentation. Ecrire `bg-ink` dans la
 * colonne `data` reviendrait a figer la feuille de style d'aujourd'hui dans le
 * contenu d'hier.
 *
 * Les `Record` sont types par les cles du registre : ajouter une surface sans
 * lui donner sa classe ne compile pas.
 */

export const SURFACE_CLASS: Record<SurfaceKey, string> = {
	paper: 'bg-paper',
	cream: 'bg-cream',
	ink: 'bg-ink text-paper',
	mesh: 'surface-mesh',
	brand: 'surface-brand'
};

/**
 * La respiration verticale.
 *
 * Trois hauteurs et pas un nombre libre : les sections du site s'enchainent, et
 * une valeur arbitraire par section casserait le rythme que DESIGN.md decrit.
 */
export const SPACING_CLASS: Record<SpacingKey, string> = {
	// Pas de marge haute : la section reprend celle du dessus, le filet du
	// composant `Section` marque la jointure.
	suite: 'pt-14 pb-16 sm:pt-20 sm:pb-24',
	compact: 'py-14 sm:py-20',
	normal: 'py-16 sm:py-20',
	ample: 'py-20 sm:py-28'
};

/** La colonne de texte du site. Identique partout, volontairement. */
export const CONTAINER = 'mx-auto max-w-6xl px-4 sm:px-6';

/**
 * Le texte secondaire, selon la surface.
 *
 * Sur l'aplat noir, un gris fige (`text-muted`) tombe a 2,6:1 et devient
 * illisible : on baisse l'opacite de la couleur heritee, ce qui garde le pire
 * cas au-dessus de 9:1. C'est la meme decision que dans `Stat.svelte`.
 */
export function mutedClass(surface: SurfaceKey): string {
	return surface === 'ink' ? 'opacity-80' : 'text-ink-soft';
}

/** Les filets de separation, selon la surface. */
export function divideClass(surface: SurfaceKey): string {
	return surface === 'ink' ? 'divide-white/15' : 'divide-ink/12';
}

export function borderClass(surface: SurfaceKey): string {
	return surface === 'ink' ? 'border-paper/20' : 'border-ink/15';
}

/**
 * La variante de bouton qui reste lisible sur la surface.
 *
 * Un contour d'encre sur un aplat noir est invisible, et c'est le genre de
 * reglage qu'on ne verifie qu'une fois la page en ligne. La section corrige
 * donc d'elle-meme les deux cas ou le choix ne tient pas.
 */
export function buttonVariantFor(raw: string, surface: SurfaceKey): ButtonVariant {
	const variant: ButtonVariant =
		BUTTON_VARIANTS.find((candidate) => candidate === raw) ?? 'primary';

	// Sur l'aplat noir : le contour d'encre et le lien souligne noir sont
	// invisibles, le plein noir se fond dans le fond.
	if (surface === 'ink') {
		if (variant === 'outline' || variant === 'ghost') return 'inverse';
		if (variant === 'primary') return 'brand';
		return variant;
	}

	// Sur les deux degrades : un bouton au degrade de marque pose sur le degrade
	// de marque ne se detache plus de son fond.
	if (surface === 'brand' || surface === 'mesh') {
		return variant === 'brand' ? 'primary' : variant === 'inverse' ? 'outline' : variant;
	}

	return variant === 'inverse' ? 'outline' : variant;
}
