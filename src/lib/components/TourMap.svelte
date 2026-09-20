<script lang="ts">
	import { settled } from '$lib/actions/settled';

	/**
	 * La carte du parcours, telle que l association l a tracee.
	 *
	 * Remplace, le 20 septembre 2026, le schema hexagonal qui tenait cette place.
	 * Ce schema reliait treize points poses a vue dans un hexagone dessine a la
	 * main : il fallait donc une legende pour prevenir qu il n etait pas une
	 * carte. La carte de l association, elle, porte le trace reel. Un institut
	 * qui publie ses donnees brutes n avait aucune raison de dessiner son propre
	 * parcours de memoire quand le document existe.
	 *
	 * Le fond de carte vient de la DILA (la mention « © DILA 2026 » est incrustee
	 * dans le fichier et reste donc visible telle quelle) ; le trace en
	 * pointilles blancs est celui de l association. La ligne de credit sous
	 * l image le dit en toutes lettres plutot que de laisser la mention incrustee
	 * porter seule l attribution.
	 *
	 * Le texte renvoie a l ancre `#carnet`, posee par `/le-tour` sur le carnet de
	 * route Polarsteps. Ce composant n a qu un seul emploi et c est cette page ;
	 * le deplacer ailleurs demande de deplacer l ancre avec.
	 */

	/** Dimensions NATIVES du fichier, pour reserver sa place avant l arrivee. */
	const MAP = {
		src: '/carte-du-tour.jpg',
		width: 2250,
		height: 2232,
		alt: 'Carte des treize régions métropolitaines, chacune nommée en toutes lettres. Le parcours du tour y est tracé en pointillés blancs : une boucle qui fait le tour du territoire et se referme sur elle-même, avec un crochet autour de l’Île-de-France. La Corse figure à part, en bas à droite.'
	} as const;

	/**
	 * Les treize regions, dans l ordre ou la carte les nomme, du nord au sud.
	 *
	 * La liste double la carte a dessein : les noms de l image sont des pixels,
	 * pas du texte. Un lecteur d ecran, une recherche dans la page et un
	 * navigateur qui n a pas charge l image trouvent ici ce que la carte montre.
	 */
	const REGIONS = [
		'Hauts-de-France',
		'Normandie',
		'Île-de-France',
		'Grand Est',
		'Bretagne',
		'Pays de la Loire',
		'Centre-Val de Loire',
		'Bourgogne-Franche-Comté',
		'Nouvelle-Aquitaine',
		'Auvergne-Rhône-Alpes',
		'Occitanie',
		"Provence-Alpes-Côte d'Azur",
		'Corse'
	] as const;

	/** Le squelette tient la place tant que le fichier n est pas arrive. */
	let arrived = $state(false);
</script>

<div class="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start lg:gap-14">
	<!--
		`block-card` et non `photo-block` : la carte porte son propre fond bleu
		pale, et l ombre du bloc photographique la ferait flotter au-dessus d une
		section qui, elle, est posee a plat. Le cadre papier lui sert de marge.
	-->
	<figure class="block-card mx-auto w-full max-w-xl p-4 sm:p-5">
		<img
			src={MAP.src}
			alt={MAP.alt}
			width={MAP.width}
			height={MAP.height}
			loading="lazy"
			decoding="async"
			use:settled={() => (arrived = true)}
			class="rounded-block w-full {arrived ? '' : 'photo-skeleton'}"
		/>
		<figcaption class="text-ink-soft mt-4 text-sm">
			Tracé du parcours par Humanitour, sur le fond de carte des régions de la DILA.
		</figcaption>
	</figure>

	<div>
		<p class="measure text-lg leading-relaxed">
			Le parcours a fait le tour du territoire et il est revenu à son point de départ. Les treize
			régions métropolitaines ont toutes été traversées, la Corse comprise. Ce que la carte ne dit
			pas, c'est le rythme : il est dans le
			<!-- Souligne d encre et non de corail : #FF5757 ne donne que 2,4:1 sur le
			     papier, et la variante « ghost » de Button pose deja ce trait-la. -->
			<a href="#carnet" class="font-medium underline decoration-2 underline-offset-4">
				carnet de route
			</a>, jour par jour.
		</p>
		<h3 class="mt-8 text-base font-semibold">Les régions traversées</h3>
		<ul class="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
			{#each REGIONS as region (region)}
				<li class="flex items-baseline gap-2.5">
					<span class="bg-coral h-2 w-2 shrink-0 -translate-y-px rounded-full" aria-hidden="true"
					></span>
					{region}
				</li>
			{/each}
		</ul>
	</div>
</div>
