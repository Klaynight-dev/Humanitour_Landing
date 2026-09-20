<script lang="ts">
	import Button from '$components/Button.svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { reveal } from '$lib/actions/reveal';
	import { settled } from '$lib/actions/settled';
	import { TOUR_PHOTOS } from '$lib/shared/photos';
	import { SITE, TOUR } from '$lib/shared/site';

	/**
	 * Les cliches dont l image est arrivee, et qui n ont donc plus de squelette.
	 *
	 * L etat de depart est le squelette pour TOUS : c est le seul etat que le
	 * serveur puisse rendre, ne sachant pas ce que le visiteur a deja en cache.
	 * L action `settled` corrige le cas echeant des l hydratation.
	 *
	 * `SvelteSet` et non `Set` : un `Set` ordinaire ne previent pas Svelte quand
	 * il change, il faudrait le recopier entier a chaque image arrivee.
	 */
	const arrived = new SvelteSet<string>();
</script>

<svelte:head>
	<title>Galerie, {SITE.name}</title>
	<meta
		name="description"
		content="Les photographies des deux mois de terrain : les rencontres, les marchés, les haltes et les hébergements des {TOUR.kilometres} kilomètres du tour."
	/>
</svelte:head>

<!--
	Registre editorial, comme `/medias` : fond creme, motif et entree de
	couverture autorises. Ce n est pas une page de chiffres, et rien ici ne se
	mesure — ce sont des preuves, pas des donnees.

	La page ne fait qu UNE chose : montrer les photographies. Les articles, les
	videos et les podcasts restent sur `/medias`, qui a son back-office et son
	propre registre. Deux hubs qui listeraient les memes contenus, ce serait deux
	endroits ou chercher et un seul a jour.
-->
<div class="bg-cream">
	<div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
		<header>
			<!-- Le mot marque, forme `mark-brand` : la surface est claire. Un seul
			     par page, et c est le seul titre de celle-ci. -->
			<h1 class="enter max-w-3xl text-4xl sm:text-5xl">
				Les <span class="mark-brand">visages</span> du tour
			</h1>
			<p class="measure enter mt-6 text-lg leading-relaxed" style="--enter-delay: 90ms">
				{TOUR.respondents} personnes rencontrées en face-à-face, {TOUR.months} mois de terrain, et chaque
				soir un hébergement chez des habitants différents. Voici à quoi ça a ressemblé.
			</p>
		</header>

		<!--
			MOTION : les photos entrent l une apres l autre, une seule fois. Le
			decalage est plafonne a la premiere rangee, comme sur `/medias` : au-dela,
			une grille de vingt-six cliches ferait attendre le dernier trois secondes
			apres le premier.

			`aspect-4/5` et `object-cover` : les cliches sont en portrait ET en
			paysage, et une grille dont chaque case a sa propre hauteur devient un
			escalier. Le cadrage est donc commun, et c est la seule vignette du site
			qui rogne — le fichier entier reste accessible en ouvrant l image.
		-->
		<ul class="mt-12 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
			{#each TOUR_PHOTOS as photo, index (photo.src)}
				<li use:reveal={(index % 3) * 110}>
					<!--
						`loading="lazy"` : vingt-six cliches en pleine definition, c'est une
						vingtaine de megaoctets. Seules les vignettes qui approchent de
						l'ecran sont demandees ; le squelette tient la place en attendant.
					-->
					<img
						src={photo.src}
						alt={photo.alt}
						width={photo.width}
						height={photo.height}
						loading="lazy"
						decoding="async"
						use:settled={() => arrived.add(photo.src)}
						class="photo-block aspect-4/5 w-full object-cover {arrived.has(photo.src)
							? ''
							: 'photo-skeleton'}"
					/>
				</li>
			{/each}
		</ul>

		<div class="mt-14">
			<p class="measure text-lg leading-relaxed">
				Les entretiens filmés pendant ces rencontres sont publiés au fil du montage, avec les
				articles et les podcasts.
			</p>
			<div class="mt-7 flex flex-wrap gap-3">
				<Button href="/medias">Voir les médias</Button>
				<Button href="/le-tour" variant="outline">Comment l'enquête a été menée</Button>
			</div>
		</div>
	</div>
</div>
