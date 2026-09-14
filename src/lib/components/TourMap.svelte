<script lang="ts">
	/**
	 * Illustration schematique, pas une carte geographique precise : le trace
	 * ville par ville n'est pas encore public (voir la legende sous le SVG).
	 * Le cadre hexagonal reprend le surnom courant de la France, coherent avec
	 * le titrage massif et les aplats du reste du site plutot qu'un fond de
	 * carte importe.
	 *
	 * Les 13 regions metropolitaines et leur position relative dans le cadre :
	 * fait public et verifiable (decoupage regional francais depuis 2016), la
	 * position de chaque point est approximative et sert la lisibilite du
	 * schema, pas une precision cartographique.
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

	const PATH = REGIONS.map((r) => `${r.x},${r.y}`).join(' ');
</script>

<div class="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
	<svg
		viewBox="0 0 360 380"
		class="border-ink brut rounded-card bg-paper mx-auto w-full max-w-sm shrink-0"
		aria-hidden="true"
	>
		<polygon
			points="180,10 340,110 340,270 180,370 20,270 20,110"
			fill="var(--color-cream)"
			stroke="var(--color-ink)"
			stroke-width="2"
		/>
		<polyline
			points={PATH}
			fill="none"
			stroke="var(--color-coral-500)"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-dasharray="1 9"
		/>
		{#each REGIONS as region (region.name)}
			<circle cx={region.x} cy={region.y} r="6" fill="var(--color-ink)" />
			<circle cx={region.x} cy={region.y} r="3" fill="var(--color-orange-500)" />
		{/each}
	</svg>

	<div>
		<p class="text-muted text-sm">
			Schéma, pas une carte précise : le tracé ville par ville et les dates de passage n'ont pas
			encore été publiés. Ce que montrent les 13 points, c'est l'étendue déjà annoncée du
			parcours : les treize régions métropolitaines, îles comprises.
		</p>
		<ul class="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
			{#each REGIONS as region (region.name)}
				<li class="flex items-center gap-2">
					<span class="bg-coral-500 h-2 w-2 shrink-0 rounded-full" aria-hidden="true"></span>
					{region.name}
				</li>
			{/each}
		</ul>
	</div>
</div>
