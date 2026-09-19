<script lang="ts">
	/**
	 * Schema du parcours, pas une carte geographique precise : le trace ville par
	 * ville n'est pas publie (voir la legende sous le SVG). Le cadre hexagonal
	 * reprend le surnom courant de la France, et le trait fin repond au dessin au
	 * trait du logo plutot qu'a un fond de carte importe.
	 *
	 * Les 13 regions metropolitaines et leur position relative dans le cadre :
	 * fait public et verifiable (decoupage regional francais depuis 2016). La
	 * position de chaque point est approximative et sert la lisibilite du schema,
	 * pas une precision cartographique.
	 */
	const REGIONS = [
		{ name: 'Hauts-de-France', x: 165, y: 45 },
		{ name: 'Normandie', x: 95, y: 78 },
		{ name: 'Île-de-France', x: 175, y: 100 },
		{ name: 'Grand Est', x: 268, y: 90 },
		{ name: 'Bretagne', x: 38, y: 130 },
		{ name: 'Pays de la Loire', x: 92, y: 178 },
		{ name: 'Centre-Val de Loire', x: 162, y: 168 },
		{ name: 'Bourgogne-Franche-Comté', x: 245, y: 165 },
		{ name: 'Nouvelle-Aquitaine', x: 95, y: 250 },
		{ name: 'Auvergne-Rhône-Alpes', x: 245, y: 232 },
		{ name: 'Occitanie', x: 165, y: 300 },
		{ name: "Provence-Alpes-Côte d'Azur", x: 285, y: 278 },
		{ name: 'Corse', x: 322, y: 335 }
	] as const;

	type RegionName = (typeof REGIONS)[number]['name'];

	const POINTS = new Map(REGIONS.map((region) => [region.name, region]));

	/**
	 * L ordre du PARCOURS, et non l ordre de declaration ci-dessus.
	 *
	 * Correction du 19 septembre 2026 : le trace reliait les regions dans
	 * l ordre du tableau, ce qui donnait Hauts-de-France, Normandie,
	 * Île-de-France, Grand Est, puis Bretagne. Ce zigzag ne ressemblait a aucun
	 * trajet possible. La carte de l association montre une BOUCLE autour du
	 * pays, qui revient a son point de depart.
	 *
	 * Ce qui est affirme ici, et rien de plus : le parcours fait le tour du
	 * territoire et se referme. L ordre des regions le long de la boucle est
	 * geographique, il n est pas reconstitue a partir d un carnet de route. Le
	 * trait reste en pointilles et la legende reste explicite tant que
	 * l itineraire ville par ville n est pas publie.
	 */
	const LOOP: readonly RegionName[] = [
		'Bretagne',
		'Normandie',
		'Hauts-de-France',
		'Île-de-France',
		'Grand Est',
		'Bourgogne-Franche-Comté',
		'Auvergne-Rhône-Alpes',
		"Provence-Alpes-Côte d'Azur",
		'Occitanie',
		'Nouvelle-Aquitaine',
		'Centre-Val de Loire',
		'Pays de la Loire'
	];

	/** `Z` ferme la boucle : le parcours revient a son point de depart. */
	const LOOP_PATH =
		LOOP.map((name, index) => {
			const point = POINTS.get(name)!;
			return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
		}).join(' ') + ' Z';

	/**
	 * La Corse est reliee par un segment a part, comme sur la carte de
	 * l association : on n y va pas a velo depuis le continent.
	 */
	const PACA = POINTS.get("Provence-Alpes-Côte d'Azur")!;
	const CORSE = POINTS.get('Corse')!;
</script>

<div class="grid gap-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center lg:gap-12">
	<svg
		viewBox="0 0 360 380"
		class="block-card mx-auto w-full max-w-sm shrink-0 p-4"
		aria-hidden="true"
	>
		<polygon
			points="180,10 340,110 340,270 180,370 20,270 20,110"
			fill="var(--color-cream)"
			stroke="var(--color-ink)"
			stroke-width="1.75"
			stroke-linejoin="round"
		/>

		<!-- Pointilles : le trait dit lui-meme qu il approche un parcours au lieu
		     d en tracer l itineraire exact. -->
		<path
			d={LOOP_PATH}
			fill="none"
			stroke="var(--color-coral)"
			stroke-width="3"
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-dasharray="9 7"
		/>

		<line
			x1={PACA.x}
			y1={PACA.y}
			x2={CORSE.x}
			y2={CORSE.y}
			stroke="var(--color-coral)"
			stroke-width="3"
			stroke-linecap="round"
			stroke-dasharray="9 7"
		/>

		{#each REGIONS as region (region.name)}
			<circle cx={region.x} cy={region.y} r="6.5" fill="var(--color-ink)" />
		{/each}
	</svg>

	<div>
		<p class="measure text-lg leading-relaxed">
			Le parcours a fait le tour du territoire et il est revenu à son point de départ. Le tracé
			ville par ville n'a pas encore été publié : ce schéma montre la forme et l'étendue du
			parcours, pas son itinéraire exact. Les treize régions métropolitaines ont toutes été
			traversées, la Corse comprise.
		</p>
		<h3 class="mt-8 text-base font-semibold">Les régions traversées</h3>
		<ul class="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
			{#each REGIONS as region (region.name)}
				<li class="flex items-baseline gap-2.5">
					<span class="bg-coral h-2 w-2 shrink-0 -translate-y-px rounded-full" aria-hidden="true"
					></span>
					{region.name}
				</li>
			{/each}
		</ul>
	</div>
</div>
