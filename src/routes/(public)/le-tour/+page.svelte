<script lang="ts">
	import Button from '$components/Button.svelte';
	import MeshShader from '$components/MeshShader.svelte';
	import Stat from '$components/Stat.svelte';
	import TourMap from '$components/TourMap.svelte';
	import { LINKS, SITE } from '$lib/shared/site';

	const REASONS = [
		{
			title: 'Aucun panel, aucun courriel',
			body: "Les instituts privés recrutent en ligne, auprès de volontaires déjà inscrits et rémunérés en bons d'achat. Le vélo impose l'inverse : on rencontre les gens là où ils sont, sans présélection."
		},
		{
			title: 'La France entière, pas les métropoles',
			body: "Un sondage par courriel surreprésente les grandes villes connectées. Un parcours à vélo traverse aussi les bourgs et les zones rurales que les panels en ligne n'atteignent jamais."
		},
		{
			title: 'Des échanges documentés',
			body: "Chaque entretien est enregistré avec l'accord de la personne, pour donner à entendre les voix derrière les pourcentages, pas seulement le chiffre final."
		}
	];
</script>

<svelte:head>
	<title>Le tour - {SITE.name}</title>
	<meta
		name="description"
		content="5 000 kilomètres à vélo, deux mois, les 13 régions métropolitaines : pourquoi Humanitour va à la rencontre des gens plutôt que de les sonder par courriel."
	/>
</svelte:head>

<!-- Hero -->
<section class="border-ink relative overflow-hidden border-b-2">
	<div class="surface-mesh absolute inset-0" aria-hidden="true"></div>
	<MeshShader />
	<div class="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
		<p class="font-display text-xs font-bold tracking-[0.2em] uppercase">Le tour</p>
		<h1
			class="font-display mt-3 max-w-4xl text-3xl leading-[0.95] font-black tracking-tighter wrap-break-word uppercase sm:text-6xl lg:text-7xl"
		>
			5 000 kilomètres à la rencontre de la France
		</h1>
		<p class="mt-8 max-w-2xl text-lg font-medium sm:text-xl">
			Un sondage ne se construit pas depuis un bureau. Il se construit sur la route, en s'arrêtant
			pour écouter, dans les treize régions métropolitaines.
		</p>
		<div class="mt-9 flex flex-wrap gap-3">
			<Button href="/donnees" size="lg">Voir les données déjà collectées</Button>
			<Button href={LINKS.helloasso.href} external size="lg" variant="outline">
				Soutenir le tour
			</Button>
		</div>
	</div>
</section>

<!-- Chiffres -->
<section class="border-ink bg-ink border-b-2 text-white" aria-label="Le tour en chiffres">
	<div class="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 lg:grid-cols-4">
		<Stat value="5 000 km" label="À vélo" hint="À travers les régions métropolitaines" />
		<Stat value="2 mois" label="Sur le terrain" hint="En continu, au contact des habitants" />
		<Stat value="13" label="Régions" hint="Toutes les régions métropolitaines, Corse comprise" />
		<Stat value="0" label="Panel en ligne" hint="Aucun recrutement par courriel" />
	</div>
</section>

<!-- Pourquoi le velo -->
<section class="mx-auto max-w-6xl px-4 py-20 sm:px-6" aria-labelledby="pourquoi">
	<div class="max-w-3xl">
		<p class="text-coral-700 font-display text-xs font-bold tracking-[0.2em] uppercase">
			Pourquoi le vélo
		</p>
		<h2 id="pourquoi" class="font-display mt-3 text-4xl font-black tracking-tighter uppercase sm:text-5xl">
			La méthode fait partie du résultat
		</h2>
	</div>

	<ol class="mt-12 grid gap-6 md:grid-cols-3">
		{#each REASONS as reason, index (reason.title)}
			<li class="brut rounded-card bg-paper p-6">
				<span class="tabular text-coral-600 text-4xl font-bold">0{index + 1}</span>
				<h3 class="font-display mt-3 text-lg font-bold">{reason.title}</h3>
				<p class="text-ink-soft mt-2 text-sm leading-relaxed">{reason.body}</p>
			</li>
		{/each}
	</ol>
</section>

<!-- Le parcours -->
<section class="border-ink bg-surface border-y-2" aria-labelledby="parcours">
	<div class="mx-auto max-w-6xl px-4 py-20 sm:px-6">
		<p class="text-coral-700 font-display text-xs font-bold tracking-[0.2em] uppercase">
			Le parcours
		</p>
		<h2
			id="parcours"
			class="font-display mt-3 max-w-3xl text-4xl font-black tracking-tighter uppercase sm:text-5xl"
		>
			Treize régions, aucune laissée de côté
		</h2>
		<div class="mt-10">
			<TourMap />
		</div>
	</div>
</section>

<!-- Suivre le tour -->
<section class="mx-auto max-w-6xl px-4 py-20 sm:px-6" aria-labelledby="suivre">
	<div class="brut surface-mesh rounded-card px-6 py-14 sm:px-12">
		<div class="max-w-2xl">
			<h2 id="suivre" class="font-display text-4xl font-black tracking-tighter uppercase sm:text-5xl">
				Suis le tour en direct
			</h2>
			<p class="mt-6 text-lg font-medium">
				Les étapes, les dates de passage et les premiers résultats se partagent d'abord sur le
				Discord de l'association, au fil du terrain.
			</p>
			<div class="mt-9 flex flex-wrap gap-3">
				<Button href={LINKS.discord.href} external size="lg">Rejoindre le Discord</Button>
				<Button href={LINKS.forms.href} external size="lg" variant="outline">
					Répondre au sondage
				</Button>
			</div>
		</div>
	</div>
</section>
