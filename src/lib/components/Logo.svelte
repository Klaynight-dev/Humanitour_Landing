<script lang="ts">
	interface Props {
		/** Cote du badge, en pixels. */
		size?: number;
		/** Titre accessible. Vide pour un usage purement decoratif. */
		title?: string;
		class?: string;
	}

	let { size = 40, title = '', class: className = '' }: Props = $props();

	/**
	 * Le degrade est defini une fois par instance avec un identifiant unique.
	 *
	 * Deux `<svg>` partageant un meme id de `<defs>` sur la meme page font que le
	 * second reprend la definition du premier : inoffensif tant qu'elles sont
	 * identiques, mais pas si un jour l'une d'elles change de teintes.
	 */
	const gradientId = `humanitour-globe-${Math.random().toString(36).slice(2, 9)}`;
</script>

<!--
	Badge : la Terre enlacee par des mains humaines.

	Dessine en SVG inline plutot qu'importe comme fichier : il herite de la
	couleur du texte, reste net a toutes les tailles, et ne coute pas une requete.

	Geometrie pensee pour 28 px, la plus petite taille d'usage : le globe occupe
	le haut, les mains le berceau du bas, et les deux ne se chevauchent pas. Un
	dessin qui se superpose devient une tache noire des qu'il retrecit.
-->
<svg
	viewBox="0 0 64 64"
	width={size}
	height={size}
	class={className}
	role={title ? 'img' : 'presentation'}
	aria-hidden={title ? undefined : 'true'}
	aria-label={title || undefined}
>
	<defs>
		<linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
			<stop offset="0%" stop-color="#FF88B7" />
			<stop offset="50%" stop-color="#FF5757" />
			<stop offset="100%" stop-color="#FF751F" />
		</linearGradient>
	</defs>

	<!-- La Terre, dans la moitie haute -->
	<circle cx="32" cy="24" r="14" fill="url(#{gradientId})" stroke="currentColor" stroke-width="3.5" />

	<!-- Un continent, assez large pour survivre a la reduction -->
	<path
		d="M22 20c3-1 4 2 7 2s4-3 7-2 1 5-2 6-3 4-6 3-4-2-5-4-2-4-1-5z"
		fill="currentColor"
		opacity="0.3"
	/>

	<!-- Les mains : un berceau franc sous le globe, sans le recouvrir -->
	<path
		d="M9 33c0 12 10 20 23 20s23-8 23-20"
		fill="none"
		stroke="currentColor"
		stroke-width="6"
		stroke-linecap="round"
	/>

	<!-- Les pouces, qui remontent de chaque cote -->
	<path
		d="M9 33c0-5 2-8 5-9M55 33c0-5-2-8-5-9"
		fill="none"
		stroke="currentColor"
		stroke-width="6"
		stroke-linecap="round"
	/>
</svg>
