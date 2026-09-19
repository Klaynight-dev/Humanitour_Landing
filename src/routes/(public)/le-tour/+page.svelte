<script lang="ts">
	import ContentBlocks from '$components/ContentBlocks.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	import Button from '$components/Button.svelte';
	import MeshShader from '$components/MeshShader.svelte';
	import Stat from '$components/Stat.svelte';
	import TourMap from '$components/TourMap.svelte';
	import { reveal } from '$lib/actions/reveal';
	import { LINKS, SITE, TOUR } from '$lib/shared/site';

	/** Ce que le velo a change a la methode, par rapport a un panel en ligne. */
	const METHOD = [
		{
			title: 'Aucun panel, aucun courriel',
			body: "Les instituts privés recrutent en ligne, auprès de volontaires déjà inscrits et rémunérés en bons d'achat. Le vélo a imposé l'inverse : les gens ont été rencontrés là où ils vivent, sans présélection."
		},
		{
			title: 'La France entière, pas les métropoles',
			body: "Un sondage par courriel surreprésente les grandes villes connectées. Le parcours a traversé les bourgs et les zones rurales que les panels en ligne n'atteignent jamais."
		},
		{
			title: 'Des échanges documentés',
			body: "Chaque entretien a été enregistré avec l'accord de la personne, pour donner à entendre les voix derrière les pourcentages et pas seulement le chiffre final."
		}
	];
</script>

<svelte:head>
	<title>Le tour, {SITE.name}</title>
	<meta
		name="description"
		content="{TOUR.kilometres} kilomètres à vélo en {TOUR.months} mois, à travers les {TOUR.regions} régions métropolitaines : comment Humanitour est allé rencontrer {TOUR.respondents} personnes plutôt que de les sonder par courriel."
	/>
</svelte:head>

<!-- Contenu edite au back-office, s'il a ete publie ; sinon la page d'origine. -->
{#if data.blocks}
	<ContentBlocks blocks={data.blocks} />
{:else}

<!--
	Hero. Le shader anime n est monte que sur cette page : c est la seule dont le
	sujet, un parcours a velo, justifie du mouvement en fond (R-19 antislop). Il
	se retire de lui-meme si `prefers-reduced-motion` est actif.
-->
<section class="relative overflow-hidden" aria-labelledby="titre">
	<div class="surface-mesh absolute inset-0" aria-hidden="true"></div>
	<MeshShader />
	<div class="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
		<!--
			Le mot marque, forme `mark-ink` : sur le degrade, `mark-brand` serait un
			degrade sur un degrade et l etiquette disparaitrait. Le noir est la
			seconde surface primaire de la charte, et le blanc y donne 21:1.
		-->
		<h1 id="titre" class="enter max-w-4xl">
			4&#8239;000 kilomètres à la rencontre de la <span class="mark-ink">France</span>
		</h1>
		<p class="measure enter mt-7 text-xl font-medium sm:text-2xl" style="--enter-delay: 90ms">
			Un sondage ne se construit pas depuis un bureau. Celui-ci s'est construit sur la route, en
			s'arrêtant pour écouter, dans les treize régions métropolitaines.
		</p>
		<div class="enter mt-10 flex flex-wrap gap-3" style="--enter-delay: 180ms">
			<Button href="/donnees" size="lg">Voir les résultats</Button>
			<Button href={LINKS.helloasso.href} external size="lg" variant="outline">
				Soutenir la suite
			</Button>
		</div>
	</div>
</section>

<!-- Le bilan chiffre, sur aplat noir. -->
<section class="bg-ink text-paper" aria-label="Le tour en chiffres">
	<div class="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
		<Stat value="4&#8239;000 km" label="À vélo" hint="À travers les régions métropolitaines" />
		<Stat value="2 mois" label="Sur le terrain" hint="En continu, au contact des habitants" />
		<Stat value="13" label="Régions" hint="Toutes les métropolitaines, Corse comprise" />
		<Stat value="1&#8239;000" label="Personnes" hint="Rencontrées en face-à-face" />
	</div>
</section>

<!--
	La methode. Mesure courte, pas de grille de cartes identiques.

	C est la section creme de cette page, donc celle qui porte les deux aplats
	organiques : une section par page, toujours creme, toujours aux memes deux
	coins (`app.css`). Ils sont dans les marges, pas sous le texte.
-->
<section class="bg-cream relative isolate overflow-hidden" aria-labelledby="methode">
	<div class="shape-field" aria-hidden="true">
		<span class="shape shape-coral"></span>
		<span class="shape shape-pink"></span>
	</div>

	<div class="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
		<h2 id="methode" class="max-w-3xl">La méthode fait partie du résultat</h2>

		<dl class="divide-ink/12 mt-10 flex flex-col divide-y">
			{#each METHOD as item (item.title)}
				<div class="grid gap-2 py-7 sm:grid-cols-[16rem_minmax(0,1fr)] sm:gap-10">
					<dt class="text-xl font-semibold">{item.title}</dt>
					<dd class="text-ink-soft measure leading-relaxed">{item.body}</dd>
				</div>
			{/each}
		</dl>
	</div>
</section>

<!-- Le parcours. -->
<section class="bg-paper" aria-labelledby="parcours">
	<div class="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
		<h2 id="parcours" class="max-w-3xl">Treize régions, aucune laissée de côté</h2>
		<!-- MOTION : le schema entre une fois quand il atteint la zone de lecture.
		     C est le seul declenchement au defilement de cette page. -->
		<div class="mt-10" use:reveal>
			<TourMap />
		</div>
	</div>
</section>

<!-- Le sondage-reportage : ce que le terrain a produit en plus des chiffres. -->
<section class="bg-cream" aria-labelledby="reportage">
	<div class="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
		<div class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
			<div>
				<h2 id="reportage">Le premier sondage-reportage</h2>
				<p class="measure mt-6 text-lg leading-relaxed">
					{TOUR.voteSharedRatio} personnes rencontrées ont accepté de partager leur vote, et {TOUR.onCameraRatio}
					ont répondu face caméra. L'équipe a été hébergée chaque soir chez des habitants différents.
				</p>
				<p class="measure text-ink-soft mt-5 leading-relaxed">
					Tous les échanges ont été enregistrés. Ils seront diffusés dans une série documentaire qui
					présentera l'enquête et sa méthode, entretien par entretien.
				</p>
				<div class="mt-8 flex flex-wrap gap-3">
					<Button href="/medias" size="lg" variant="outline">Voir la médiathèque</Button>
				</div>
			</div>

			<p class="font-hand self-center -rotate-2 text-3xl leading-tight sm:text-4xl">
				mille personnes,<br />mille conversations
			</p>
		</div>
	</div>
</section>

<!-- Cloture. -->
<section class="surface-brand" aria-labelledby="suivre">
	<div class="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
		<h2 id="suivre" class="max-w-3xl text-3xl sm:text-5xl">La suite se décide avec ses adhérents</h2>
		<p class="measure mt-7 text-xl font-medium">
			Les résultats, les prochaines étapes et les coulisses se partagent d'abord sur le Discord de
			l'association.
		</p>
		<div class="mt-10 flex flex-wrap gap-3">
			<Button href={LINKS.discord.href} external size="lg">Rejoindre le Discord</Button>
			<Button href={LINKS.helloasso.href} external size="lg" variant="outline">
				Adhérer à l'association
			</Button>
		</div>
	</div>
</section>
{/if}
