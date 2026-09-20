<script lang="ts">
	import Button from '$components/Button.svelte';
	import ContentBlocks from '$components/ContentBlocks.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	import { reveal } from '$lib/actions/reveal';
	import { DECK_PHOTOS, HERO_PHOTO, TOUR_PHOTOS } from '$lib/shared/photos';
	import { LINKS, PILLARS, QUESTIONS, SITE, TOUR } from '$lib/shared/site';

	/**
	 * La ligne de l equipe defile a l horizontale (voir plus bas). Les deux
	 * booleens pilotent l affichage des fleches : la gauche n apparait qu une
	 * fois qu on a avance, la droite disparait en butee de fin, pour qu aucune
	 * des deux ne propose un mouvement impossible.
	 */
	let teamRow: HTMLUListElement | undefined = $state();
	let canScrollTeamLeft = $state(false);
	let canScrollTeamRight = $state(false);

	function updateTeamScrollState() {
		if (!teamRow) return;
		canScrollTeamLeft = teamRow.scrollLeft > 4;
		canScrollTeamRight = teamRow.scrollLeft + teamRow.clientWidth < teamRow.scrollWidth - 4;
	}

	function scrollTeam(direction: 1 | -1) {
		teamRow?.scrollBy({ left: direction * 176, behavior: 'smooth' });
	}

	$effect(() => {
		if (!teamRow) return;
		updateTeamScrollState();
		// Le nombre de portraits est fixe au chargement, mais leur largeur ne l
		// est pas (redimensionnement de fenetre, zoom) : les deux ecouteurs
		// gardent les fleches justes dans les deux cas.
		teamRow.addEventListener('scroll', updateTeamScrollState, { passive: true });
		window.addEventListener('resize', updateTeamScrollState);
		return () => {
			teamRow?.removeEventListener('scroll', updateTeamScrollState);
			window.removeEventListener('resize', updateTeamScrollState);
		};
	});

	/**
	 * L ecart entre l estimation et l urne, repris du dossier « Le constat »
	 * (source/Humanitour.pdf, section « Les sondages posent question »).
	 *
	 * Les estimations y sont donnees comme des ordres de grandeur : elles sont
	 * affichees comme telles, pas arrondies en faux chiffres precis. Les
	 * resultats, eux, sont des scores officiels.
	 */
	const POLLING_GAPS = [
		{ who: 'Jean-Luc Mélenchon', year: '2017', polled: 'environ 10 %', actual: '19,58 %' },
		{ who: 'Jean-Luc Mélenchon', year: '2022', polled: 'environ 10 %', actual: '21,95 %' },
		{ who: 'Valérie Pécresse', year: '2022', polled: "jusqu'à 20 %", actual: '4,78 %' },
		{ who: 'Éric Zemmour', year: '2022', polled: '18 %', actual: '7,07 %' }
	];

	/** Ce que l enquete de terrain a produit (plaquette, section « Le lancement »). */
	const FIGURES = [
		// U+202F, espace fine insecable : c est le separateur de milliers francais,
		// et l espace ordinaire de Bowlby One creuse un trou dans le millier.
		{ value: '4 000 km', label: 'parcourus à vélo' },
		{ value: '2 mois', label: 'sur le terrain, sans interruption' },
		{ value: '13', label: 'régions métropolitaines traversées' },
		{ value: '1 000', label: 'personnes rencontrées en face-à-face' }
	];

	/**
	 * Les trois biais releves par Bourdieu en 1972, dans la formulation du
	 * dossier « Le constat » de l association.
	 */
	const BIASES = [
		{
			title: "L'imposition de problématiques",
			body: 'Les sondages posent des questions artificielles, que les gens ne se posent pas forcément.'
		},
		{
			title: "L'illusion de la réponse universelle",
			body: "Les individus sont incités à répondre même s'ils ne comprennent pas la question."
		},
		{
			title: "La fabrication d'un consensus",
			body: "Les « non-réponses » sont ignorées et créent l'illusion d'une opinion publique unanime."
		}
	];

	/** Le sondage commande sur fonds publics, meme source. */
	const PUBLIC_SPENDING = [
		{
			figure: '9 M€',
			body: "de sondages commandés par l'Élysée sous la présidence de Nicolas Sarkozy, sans mise en concurrence ni transparence, ce qui a entraîné des condamnations pour détournement de fonds publics et favoritisme."
		},
		{
			figure: '3,18 M€',
			body: "pour 87 études et sondages commandés en 2019 par le Service d'information du gouvernement."
		},
		{
			figure: '300',
			body: "sondages publiés pendant la campagne présidentielle de 2022, soit plus d'un par jour, ce qui installe la logique de course de chevaux au détriment des programmes."
		}
	];
</script>

<svelte:head>
	<title>{SITE.name}, {SITE.tagline}</title>
	<meta name="description" content={SITE.description} />
	<meta property="og:title" content="{SITE.name}, {SITE.tagline}" />
	<meta property="og:description" content={SITE.description} />
	<meta property="og:image" content="/logo-badge.png" />
	<meta property="og:type" content="website" />
</svelte:head>

<!--
	Contenu edite au back-office, quand la page y a ete publiee.

	Tant qu'elle ne l'est pas, c'est la composition d'origine ci-dessous qui
	s'affiche : le CMS ne remplace la page que lorsque quelqu'un l'a voulu.
-->
{#if data.blocks}
	<ContentBlocks blocks={data.blocks} />
{:else}

<!--
	Couverture photographique.

	Le tour a eu lieu, il a ete fait par des gens a velo : la couverture montre
	cette scene au lieu de la raconter. L aplat noir de la charte reste la
	surface porteuse, la photo occupe la colonne de droite et se fond dedans.

	Deux compositions, et l ecart entre elles est une contrainte de lisibilite,
	pas un gout : superposer le texte a la photo sur un telephone demanderait un
	voile si dense que la photo disparaitrait. Sur mobile la photo est donc une
	bande en tete, sur grand ecran elle passe a droite derriere un degrade noir.

	Contraste : sous le texte, le voile ne descend jamais sous 0,93 d opacite, ce
	qui ramene meme le blanc de l escalier a une luminance de 0,06. Le blanc y
	donne au minimum 9:1, largement au-dessus du seuil AA.

	Le degrade de marque n apparait pas ici : il est garde pour un seul moment de
	la page, la colonne des resultats juste en dessous. Sur la couverture,
	l accent colore est celui de la photo elle-meme, le casque rouge et le coq
	orange, qui sont deja les couleurs de la charte.
-->
<section class="hero bg-ink text-paper relative isolate overflow-hidden" aria-labelledby="titre">
	<div class="hero-media">
		<img
			src={HERO_PHOTO.src}
			alt={HERO_PHOTO.alt}
			width={HERO_PHOTO.width}
			height={HERO_PHOTO.height}
			fetchpriority="high"
			decoding="async"
			class="hero-photo"
		/>
		<div class="hero-scrim" aria-hidden="true"></div>

		<!--
			L accent manuscrit de la charte, une seule fois par page. Il est pose
			sur la photo et non a cote : il commente la scene, il ne legende pas le
			texte. Le bas du cadre est la seule zone ou du blanc tient, et le voile
			y monte a 0,88 pour le garantir.
		-->
		<p class="font-hand hero-accent enter" style="--enter-delay: 420ms">
			et oui, aucun milliardaire<br />ne nous dit quoi faire&nbsp;!
		</p>
	</div>

	<!--
		`w-full` : la section est devenue un conteneur flex pour tenir dans un
		ecran, et dans un flex, une marge automatique sur l axe transversal
		ANNULE l etirement. Sans lui, le bloc se reduisait a son contenu, 624 px
		au lieu de 1152, et `mx-auto` le recentrait : le titre ne s alignait plus
		sur le logo de l en-tete.
	-->
	<div class="hero-body mx-auto w-full max-w-6xl px-4 pt-5 pb-6 sm:px-6 sm:pb-10 lg:py-12">
		<div class="lg:max-w-xl">
			<!--
				MOTION : entree unique au chargement, echelonnee dans l ordre de
				lecture. Elle se joue une fois, ne boucle pas, ne se rejoue pas au
				defilement, et `prefers-reduced-motion` la supprime entierement.
			-->
			<!--
				Le mot surligne (`mark-brand`) est le motif de la page : une etiquette
				au degrade de marque, de travers, sur le mot qui porte la question.
				Il n apparait que deux fois, sur les deux titres de l aplat noir, et
				c est ce qui lui garde sa valeur.
			-->
			<h1 id="titre" class="hero-title enter">
				Les sondages disent-ils la <span class="mark-brand">vérité</span>&nbsp;?
			</h1>

			<p class="measure enter mt-5 leading-relaxed sm:text-lg" style="--enter-delay: 90ms">
				<!-- `toLocaleString` : sans lui, « 1000 » s ecrivait sans separateur de
				     milliers juste au-dessus de « 1 000 » dans la grille de chiffres. -->
				Un institut de sondage citoyen. {TOUR.respondents.toLocaleString('fr-FR')} personnes interrogées
				en face-à-face, toutes les données brutes publiées, et les non-réponses comptées comme des
				réponses.
			</p>

			<dl class="enter mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:mt-7 sm:gap-y-4" style="--enter-delay: 180ms">
				{#each FIGURES as figure (figure.label)}
					<!-- `flex-col-reverse` : le chiffre se lit en premier a l ecran, mais
					     l ordre du DOM garde le couple terme/definition dans le sens que
					     `dl` impose aux lecteurs d ecran. -->
					<div class="flex flex-col-reverse gap-1">
						<dt class="text-xs leading-snug opacity-75 sm:text-sm">{figure.label}</dt>
						<!-- `nowrap` : Bowlby One est large, « 4 000 km » se cassait en deux
						     lignes dans une demi-colonne. -->
						<dd class="font-display text-lg leading-none whitespace-nowrap sm:text-2xl">
							{figure.value}
						</dd>
					</div>
				{/each}
			</dl>

			<div class="enter mt-6 flex flex-wrap gap-3 sm:mt-8" style="--enter-delay: 270ms">
				<Button href="/donnees" size="lg" variant="brand">Voir les résultats</Button>
				<Button href="/methodologie" size="lg" variant="inverse">Lire la méthodologie</Button>
			</div>
		</div>
	</div>
</section>

<!--
	L argument d ouverture, en chiffres : ce que les instituts annoncaient face a
	ce que l urne a donne. Il quitte la couverture parce que celle-ci porte
	desormais la scene, mais il reste la premiere chose lue apres elle, sur le
	meme aplat noir pour qu on lise les deux sections comme un seul bloc.
-->
<section class="bg-ink text-paper" aria-labelledby="ecart">
	<div class="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
		<div class="border-paper/20 border-t pt-14 sm:pt-20">
			<h2 id="ecart" class="max-w-3xl">
				Ce qui était annoncé, ce que <span class="mark-brand">l'urne</span> a donné
			</h2>

			<table class="mt-10 w-full border-collapse text-left sm:mt-14">
				<caption class="sr-only">
					Écart entre les estimations des instituts et les résultats du premier tour de la
					présidentielle
				</caption>
				<thead>
					<tr class="border-paper/25 border-b">
						<th scope="col" class="pb-3 text-left text-sm font-semibold opacity-70">Candidat</th>
						<th scope="col" class="px-3 pb-3 text-left text-sm font-semibold opacity-70">Annoncé</th>
						<th scope="col" class="pb-3 text-right text-sm font-semibold opacity-70">Dans l'urne</th>
					</tr>
				</thead>
				<tbody>
					{#each POLLING_GAPS as gap, index (gap.who + gap.year)}
						<tr class="border-paper/15 border-b">
							<th
								scope="row"
								class="py-4 text-left align-baseline text-base font-semibold sm:py-5 sm:text-lg"
							>
								{gap.who}
								<span class="block text-sm font-normal opacity-60">{gap.year}</span>
							</th>
							<td class="px-3 py-4 align-baseline text-sm opacity-70 sm:py-5 sm:text-base">
								{gap.polled}
							</td>
							<td class="py-4 text-right align-baseline sm:py-5">
								<!--
									MOTION : un seul geste, joue une fois au chargement, les
									resultats tombent ligne par ligne comme le soir d un scrutin.
									Aucune boucle, aucun declenchement au defilement.
									`prefers-reduced-motion` le coupe, et l etat de base est deja
									l etat final : rien ne depend de l animation pour etre lu.
								-->
								<!-- Corps degrossi : a `text-6xl`, la colonne des resultats pesait
								     plus lourd que la couverture elle-meme et le tableau devenait
								     l affiche de la page. Il reste l argument, pas le titre. -->
								<span
									class="drop figure font-display block text-xl leading-none whitespace-nowrap sm:text-3xl lg:text-4xl"
									style="animation-delay: {index * 90 + 120}ms"
								>
									{gap.actual}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>

			<p class="measure mt-6 text-base leading-relaxed opacity-80">
				Les instituts peinent à capter la mobilisation populaire et celle de la jeunesse. Au premier
				tour de la présidentielle, l'écart entre leur estimation et le résultat dépasse régulièrement
				dix points. Estimations et résultats repris du dossier « Le constat » d'Humanitour, où les
				estimations sont données comme des ordres de grandeur et affichées comme telles.
			</p>
		</div>
	</div>
</section>

<!--
	Les quatre questions, mot pour mot. Colonne etroite a gauche, liste numerotee
	a droite : aucune autre section de la page n emploie ce gabarit.
-->
<section class="bg-paper" aria-labelledby="questions">
	<div class="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
		<div class="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-16">
			<div>
				<h2 id="questions" class="text-2xl sm:text-3xl">Ce qu'on a demandé</h2>
				<p class="text-muted mt-3 text-base leading-relaxed">
					Quatre questions, posées dans cet ordre, en face-à-face. La formulation est celle du
					terrain.
				</p>
			</div>

			<div>
				<ol class="divide-ink/12 divide-y">
					{#each QUESTIONS as question, index (question)}
						<li class="flex gap-5 py-5 first:pt-0">
							<span class="font-display text-coral-ink shrink-0 text-xl leading-tight">
								{index + 1}
							</span>
							<p class="min-w-0 text-lg leading-snug font-semibold sm:text-xl">{question}</p>
						</li>
					{/each}
				</ol>

				<div class="mt-8">
					<Button href="/donnees" size="lg">Voir les résultats</Button>
				</div>
			</div>
		</div>
	</div>
</section>

<!--
	Ce que l enquete de terrain a produit. Le degrade de marque, parce que c est
	l association qui parle d elle-meme. Texte noir sur le degrade, jamais blanc
	(2,69:1 sur l orange).

	Le deck de photographies est pose sous les chiffres qu il documente :
	« 4 000 km parcourus a velo » et les photos du tour disent la meme chose,
	l une ne decore pas l autre. Il n en montre que trois et renvoie a
	`/galerie` : l accueil donne l echelle, la galerie donne les preuves.
-->
<section class="surface-mesh" aria-labelledby="bilan">
	<div class="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
		<!--
			DEUX colonnes, et une seule rangee : le titre, les chiffres et la phrase
			tiennent a gauche, les photographies occupent la droite sur TOUTE la
			hauteur de la section. Tant que les chiffres restaient en bandeau au-
			dessus, le deck ne pouvait remplir que le bas de la section.

			`items-stretch` (defaut de la grille) et non `items-center` : c'est ce
			qui donne au deck une hauteur definie a occuper.
		-->
		<div class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16">
			<div class="flex flex-col">
				<h2 id="bilan">Deux mois de terrain, sans institut derrière</h2>

				<!--
					Deux colonnes de chiffres et non quatre : la grille vit desormais dans
					une demi-largeur, quatre y auraient casse chaque libelle.

					UNE SEULE colonne sous `sm`, et c'est mesure, pas esthetique : Bowlby
					One est tres large et `whitespace-nowrap` lui interdit de se couper,
					donc « 4 000 km » deborde d'une demi-colonne de telephone et vient
					chevaucher « 2 mois ». C'est la meme contrainte que le plancher du
					`clamp` de `h1` (DESIGN.md, Typographie), et elle se reverifie a 320 px.
				-->
				<dl class="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2">
					{#each FIGURES as figure (figure.label)}
						<!-- `flex-col-reverse` : le chiffre se lit en premier a l ecran, mais
						     l ordre du DOM garde le couple terme/definition dans le sens que
						     `dl` impose aux lecteurs d ecran. -->
						<div class="flex flex-col-reverse gap-2">
							<dt class="text-base leading-snug">{figure.label}</dt>
							<dd class="font-display text-4xl leading-none whitespace-nowrap">{figure.value}</dd>
						</div>
					{/each}
				</dl>

				<p class="measure mt-10 text-lg leading-relaxed">
					{TOUR.voteSharedRatio} personnes rencontrées ont accepté de partager leur vote, et {TOUR.onCameraRatio}
					ont répondu face caméra. Chaque soir, l'équipe a été hébergée chez des habitants différents.
				</p>
			</div>

			<!--
				MOTION : le bloc entre une fois, quand il atteint la zone de lecture
				(DESIGN.md limite `reveal` a ce moment et aux portraits de l equipe).
				L ouverture de l eventail, elle, repond au survol et au focus clavier.

				Un seul lien porte le deck entier : les trois cliches sont un seul
				objet, et trois liens empiles donneraient trois arrets de tabulation
				pour une seule destination. Les images sont donc `alt=""`, leur contenu
				etant deja porte par l intitule du lien.
			-->
			<div class="h-full" use:reveal>
				<a
					href="/galerie"
					class="photo-deck-link rounded-block focus-visible:outline-ink flex h-full focus-visible:outline-2 focus-visible:outline-offset-8"
				>
					<span class="photo-deck">
						{#each DECK_PHOTOS as photo (photo.src)}
							<img
								src={photo.src}
								alt=""
								width={photo.width}
								height={photo.height}
								loading="lazy"
								decoding="async"
								class="photo-deck-card photo-block"
							/>
						{/each}

						<span
							class="photo-deck-label glass-chip rounded-pill text-ink inline-flex min-h-11 items-center px-5 py-2.5 text-sm font-semibold"
						>
							Voir la galerie — {TOUR_PHOTOS.length} photos
						</span>
					</span>
				</a>
			</div>
		</div>
	</div>
</section>

<!--
	Le constat. Composition asymetrique : l attribution tient dans une colonne
	etroite a gauche, la citation et les trois biais occupent la largeur utile.
-->
<section class="bg-cream" aria-labelledby="constat">
	<div class="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
		<div class="grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
			<div>
				<h2 id="constat" class="text-2xl sm:text-3xl">Le constat sociologique</h2>
				<p class="text-muted mt-3 text-base">Pierre Bourdieu, 1972</p>
			</div>

			<div>
				<blockquote class="measure text-2xl leading-snug font-medium sm:text-3xl">
					« L'effet fondamental du sondage d'opinion est de constituer l'illusion qu'il existe une
					opinion publique unanime, pour légitimer une politique. »
				</blockquote>
				<p class="text-muted mt-4 text-base">Pierre Bourdieu, 1980</p>

				<p class="measure mt-12 text-lg leading-relaxed">
					Bourdieu ne conteste pas la technique du sondage, mais la manière dont il est fabriqué et
					par qui. Il relève trois biais. Un demi-siècle plus tard, ils sont devenus des méthodes.
				</p>

				<dl class="mt-10 flex flex-col gap-8">
					{#each BIASES as bias (bias.title)}
						<div class="measure">
							<dt class="text-xl font-semibold">{bias.title}</dt>
							<dd class="text-ink-soft mt-2 leading-relaxed">{bias.body}</dd>
						</div>
					{/each}
				</dl>
			</div>
		</div>
	</div>
</section>

<!-- Le commanditaire : qui paie les sondages des autres, et a quel rythme. -->
<section class="bg-paper" aria-labelledby="commande">
	<div class="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
		<h2 id="commande" class="max-w-3xl">Qui commande les sondages, et à quel prix</h2>
		<p class="measure mt-6 text-lg leading-relaxed">
			Un sondage a toujours un commanditaire. Quand c'est l'État, la facture est publique, et elle a
			déjà valu des condamnations.
		</p>

		<div class="mt-14 grid gap-10 md:grid-cols-3">
			{#each PUBLIC_SPENDING as item (item.figure)}
				<div>
					<p class="font-display text-coral-ink text-3xl leading-none sm:text-4xl">{item.figure}</p>
					<p class="text-ink-soft mt-3 leading-relaxed">{item.body}</p>
				</div>
			{/each}
		</div>

		<p class="text-muted mt-10 text-sm">Chiffres repris du dossier « Le constat » d'Humanitour.</p>
	</div>
</section>

{#snippet teamArrowIcon(extraClass = '')}
	<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" class={extraClass}>
		<path
			d="M5 12h14M13 6l6 6-6 6"
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</svg>
{/snippet}

<!--
	L equipe, juste apres la section sur l opacite des commanditaires : c est la
	reponse a la question que cette section pose. Cinq personnes, nommees, avec
	leur visage, sur une seule ligne.

	L ordre vient de `+page.server.ts`, tire au hasard a chaque chargement de la
	page : sans cela, les premieres fiches de `TEAM` recevraient toujours plus
	d attention que les dernieres.

	Une seule ligne, y compris sur mobile : elle defile horizontalement plutot
	que de se replier sur plusieurs rangees, ce qui aurait avantage les fiches du
	haut. La derniere case n est pas un visage mais un lien « Voir plus » vers
	`/a-propos`, seule facon de voir l equipe au complet quand elle deborde du
	cadre.

	Les portraits viennent de la plaquette (`static/equipe/`). Le `alt` est vide
	parce que le nom est ecrit juste en dessous : le repeter ferait entendre deux
	fois la meme chose a un lecteur d ecran.
-->
<section class="bg-ink text-paper" aria-labelledby="equipe">
	<div class="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
		<div class="grid gap-12 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-16">
			<div>
				<h2 id="equipe" class="text-2xl sm:text-3xl">Qui a posé les questions</h2>
				<p class="mt-4 text-base leading-relaxed opacity-80">
					Un institut qui reproche aux autres leur opacité doit pouvoir dire qui il est. Voilà les
					cinq personnes qui ont monté celui-ci.
				</p>
			</div>

			<!--
				`overflow-x-auto` + `snap-x` : sur un ecran etroit, cinq portraits a
				taille lisible ne tiennent pas dans la largeur, et les reduire jusqu a
				ce qu ils y tiennent les aurait rendus illisibles. Le defilement
				horizontal garde leur taille et la ligne unique.

				La scrollbar est masquee (`.team-row`), donc rien ne dit qu il y a
				plus de monde de chaque cote : les deux boutons fleche, en verre
				liquide comme l etiquette du deck de photos plus haut, font defiler
				la ligne d une largeur de portrait. Chacun ne s affiche que quand le
				mouvement qu il propose est possible : pas de fleche gauche tant
				qu on n a pas avance, pas de fleche droite une fois la fin atteinte.
			-->
			<div class="relative">
				<ul
					bind:this={teamRow}
					class="team-row -mx-4 flex snap-x snap-mandatory gap-x-6 overflow-x-auto px-4 pb-2"
				>
					{#each data.team as member, index (member.slug)}
						<!-- MOTION : les portraits entrent l un apres l autre, de gauche a
						     droite, une seule fois. Second et dernier declenchement au
						     defilement de la page. -->
						<li use:reveal={index * 110} class="w-28 shrink-0 snap-start sm:w-36">
							<img
								src="/equipe/{member.slug}.jpg"
								alt=""
								width="420"
								height="420"
								loading="lazy"
								decoding="async"
								class="rounded-block aspect-square w-full object-cover"
							/>
							<p class="mt-4 text-base leading-tight font-semibold">{member.name}</p>
							<p class="mt-1 text-sm opacity-70">{member.role}</p>
						</li>
					{/each}

					<li class="w-28 shrink-0 snap-start sm:w-36">
						<a
							href="/a-propos"
							aria-label="Voir plus : toute l'équipe et leurs parcours"
							class="glass-chip rounded-block text-ink focus-visible:outline-ink flex aspect-square w-full flex-col items-center justify-center gap-1.5 text-sm font-semibold transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4"
						>
							{@render teamArrowIcon()}
							Voir plus
						</a>
					</li>
				</ul>

				{#if canScrollTeamLeft}
					<button
						type="button"
						onclick={() => scrollTeam(-1)}
						aria-label="Faire défiler l'équipe vers la gauche"
						class="glass-chip text-ink focus-visible:outline-ink absolute top-14 left-2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 sm:top-18"
					>
						{@render teamArrowIcon('rotate-180')}
					</button>
				{/if}

				{#if canScrollTeamRight}
					<button
						type="button"
						onclick={() => scrollTeam(1)}
						aria-label="Faire défiler l'équipe vers la droite"
						class="glass-chip text-ink focus-visible:outline-ink absolute top-14 right-2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 sm:top-18"
					>
						{@render teamArrowIcon()}
					</button>
				{/if}
			</div>
		</div>
	</div>
</section>

<!--
	Les cinq engagements, dans les mots de l association.

	C est la seule section de la page a porter des aplats organiques : deux
	formes pleines, en debord de coin, dans deux couleurs de la charte. La
	charte est faite de formes rondes et pleines, son logo est un globe enlace,
	et l affiche imprimee travaille par aplats decoupes : c est la meme
	grammaire, a l echelle de la page.

	Trois regles les tiennent, et c est ce qui les separe de l orbe floue
	generique : elles sont PLATES (aucun degrade, aucun flou, aucune lueur),
	IMMOBILES, et sans teinte hors charte. Le texte reste noir, et le noir passe
	AA sur le corail (6,75:1) comme sur le rose (9,46:1) et le creme : aucune
	zone de la composition ne peut casser la lisibilite.

	Elles sont posees dans les marges, pas sous le texte : la premiere version
	les faisait enormes et centrees, et la section devenait une affiche coloree
	ou le propos ne passait plus.
-->
<section class="bg-cream relative isolate overflow-hidden" aria-labelledby="engagements">
	<div class="shape-field" aria-hidden="true">
		<span class="shape shape-coral"></span>
		<span class="shape shape-pink"></span>
	</div>

	<div class="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
		<h2 id="engagements" class="max-w-3xl">Ce que veut dire « institut de sondage citoyen »</h2>

		<dl class="divide-ink/12 mt-10 flex flex-col divide-y">
			{#each PILLARS as pillar (pillar.title)}
				<div class="grid gap-2 py-7 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-10">
					<dt class="text-xl font-semibold">{pillar.title}</dt>
					<dd class="text-ink-soft measure leading-relaxed">{pillar.body}</dd>
				</div>
			{/each}
		</dl>

		<div class="mt-12 flex flex-wrap gap-3">
			<Button href="/methodologie" size="lg" variant="outline">Lire la méthodologie</Button>
			<Button href={LINKS.repository.href} external size="lg" variant="ghost">
				Auditer le code source
			</Button>
		</div>
	</div>
</section>

<!-- Cloture, sur la surface de marque. -->
<section class="surface-brand" aria-labelledby="soutien">
	<div class="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
		<h2 id="soutien" class="max-w-4xl text-3xl sm:text-5xl">
			L'opinion publique n'est pas une marchandise
		</h2>

		<p class="measure mt-7 text-xl font-medium">
			Le projet est associatif, sans publicité, sans revente de données et sans actionnaire à
			satisfaire. Il appartient à ses adhérents.
		</p>

		<div class="mt-10 flex flex-wrap gap-3">
			<Button href={LINKS.helloasso.href} external size="lg">Adhérer sur HelloAsso</Button>
			<Button href={LINKS.discord.href} external size="lg" variant="outline">
				Rejoindre le Discord
			</Button>
		</div>
	</div>
</section>

{/if}

<style>
	/*
	 * LA COUVERTURE
	 *
	 * Sur mobile, la photo est une bande en tete et le texte vit sur l aplat
	 * noir en dessous. Les superposer demanderait, pour garder le texte lisible,
	 * un voile d environ 0,95 sur toute la hauteur : la photo ne serait plus
	 * qu une texture. Mieux vaut la montrer entierement sur un tiers de l ecran
	 * que la faire disparaitre sur la totalite.
	 */
	/*
	 * La couverture tient dans un ecran, en-tete deduit.
	 *
	 * `min-height` et non `height` : si le texte ne rentre pas (tres petit
	 * ecran, corps agrandi par le lecteur), la section grandit au lieu de
	 * rogner. Une couverture qui deborde de quelques pixels vaut mieux qu un
	 * titre coupe.
	 *
	 * `svh` et non `vh` : sur mobile, `vh` se cale sur la fenetre barre d'URL
	 * retractee, donc `100vh` deborde toujours au chargement.
	 */
	.hero {
		display: flex;
		min-height: calc(100svh - var(--header-h));
		flex-direction: column;
	}

	/*
	 * La bande photographique prend ce que le texte laisse. C est elle qui
	 * absorbe la difference entre un telephone court et un telephone long,
	 * plutot qu une hauteur fixe qui deborderait sur l un et laisserait un vide
	 * sur l autre.
	 */
	.hero-media {
		position: relative;
		min-height: 8rem;
		flex: 1 1 0;
		overflow: hidden;
	}

	/*
	 * `position: absolute` : en flux, l image imposait sa hauteur intrinseque
	 * (1024 px) comme base flexible, et la bande occupait 520 px au lieu de la
	 * place restante. Sortie du flux, elle ne pese plus rien dans le calcul et
	 * remplit simplement la boite.
	 */
	.hero-photo {
		position: absolute;
		inset: 0;
		height: 100%;
		width: 100%;
		object-fit: cover;
		/* Le sujet est dans le tiers haut du cadre d origine : le recadrage suit
		   la tete et le velo, pas le centre geometrique. */
		object-position: 50% 30%;
	}

	/*
	 * Le voile. Il a deux roles : raccorder la photo a l aplat noir de la
	 * section sans couture visible, et garantir le contraste du texte. Sur
	 * mobile le texte ne passe pas dessus, le voile n a donc besoin d etre
	 * opaque qu au raccord, en bas.
	 */
	/*
	 * Les arrets sont en LONGUEURS, pas en pourcentages.
	 *
	 * En pourcentage, la zone sombre suivait la hauteur de la bande, qui est
	 * desormais elastique : sur un ecran court, l accent manuscrit se retrouvait
	 * sur un voile de 0,53, soit 2,2:1, sous le seuil. En rem, le pied du cadre
	 * garde toujours les 5 rem d aplat quasi opaque qui portent l accent, quelle
	 * que soit la hauteur restante.
	 */
	.hero-scrim {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to top,
			rgb(0 0 0 / 1) 0,
			rgb(0 0 0 / 0.92) 5rem,
			rgb(0 0 0 / 0.45) 9rem,
			rgb(0 0 0 / 0.14) 14rem,
			rgb(0 0 0 / 0.1) 100%
		);
	}

	/*
	 * L accent manuscrit, pose dans le bas du cadre photographique.
	 *
	 * C est la seule zone ou du blanc tient sur l image : le voile y vaut 0,88
	 * au minimum, ce qui ramene le blanc le plus vif de la photo sous 0,11 de
	 * luminance et donne plus de 6:1. Caveat est ici a 28px minimum, donc du
	 * gros corps au sens WCAG, ou le seuil n est que de 3:1.
	 */
	.hero-accent {
		position: absolute;
		right: 1rem;
		bottom: 0.75rem;
		left: 1rem;
		rotate: -3deg;
		color: var(--color-paper);
		text-align: right;
		font-size: 1.75rem;
		line-height: 1.15;
	}

	/*
	 * Bowlby One est tres large et ne coupe pas les mots. Le `clamp` global de
	 * `h1` plafonne a 5rem, ce qui, dans la colonne de 36rem de la couverture,
	 * ferait tenir dix signes par ligne et hacherait « Les sondages ». Le
	 * plafond descend donc a 4rem ici, et seulement ici.
	 */
	.hero-title {
		font-size: clamp(1.875rem, 5.4vw, 3.25rem);
		/*
		 * 0,95 est l interlignage global de `h1`. Il est desserre ici parce que le
		 * titre porte une etiquette `mark-brand` : son rembourrage vertical
		 * mordrait sur la ligne au-dessus si les lignes restaient aussi serrees.
		 */
		line-height: 1.06;
	}

	@media (min-width: 64rem) {
		/*
		 * Grand ecran : la photo passe a droite, plein cadre en hauteur, et le
		 * texte reprend la colonne de gauche sur l aplat noir.
		 */
		/*
		 * 46 % et non 52 % : `object-fit: cover` agrandit l image jusqu a remplir
		 * la boite dans les DEUX sens, donc plus la boite est large, plus le
		 * cadrage se resserre. A 52 %, la photo etait affichee a 97 % de sa
		 * definition et perdait 16 % de sa hauteur ; a 46 %, elle tombe a 86 % et
		 * n en perd plus que 6. On voit davantage la scene.
		 */
		.hero-media {
			position: absolute;
			inset: 0 0 0 auto;
			width: 46%;
			min-height: 0;
			flex: none;
		}

		.hero-photo {
			object-position: 50% 28%;
		}

		/*
		 * Les pourcentages sont ceux de la boite photo, qui commence a 48 % de la
		 * largeur de la page. La colonne de texte, large de 36rem dans un
		 * conteneur de 72rem centre, s arrete au plus loin vers 59 % de la page,
		 * soit 21 % de cette boite : le voile y vaut encore 0,97. Le blanc le
		 * plus clair de la photo y tombe a une luminance de 0,03, ce qui donne au
		 * texte blanc plus de 18:1.
		 */
		.hero-scrim {
			/* Deux couches : le raccord horizontal avec l aplat noir, et le pied du
			   cadre qui porte l accent manuscrit. */
			background:
				/* Meme raison qu en petit ecran : le pied du cadre garde 8 rem
				   d aplat sombre sous l accent, independamment de la hauteur. */
				linear-gradient(to top, rgb(0 0 0 / 0.92) 0, rgb(0 0 0 / 0.9) 8rem, rgb(0 0 0 / 0.3) 13rem, rgb(0 0 0 / 0) 18rem),
				linear-gradient(
					to right,
					rgb(0 0 0 / 1) 0%,
					rgb(0 0 0 / 1) 18%,
					rgb(0 0 0 / 0.88) 34%,
					rgb(0 0 0 / 0.45) 56%,
					rgb(0 0 0 / 0.22) 80%,
					rgb(0 0 0 / 0.18) 100%
				);
		}

		.hero-accent {
			right: 2.5rem;
			bottom: 2rem;
			left: auto;
			max-width: 22rem;
			font-size: 2.25rem;
		}

		.hero-body {
			position: relative;
			display: flex;
			min-height: calc(100svh - var(--header-h));
			flex-direction: column;
			justify-content: center;
		}
	}

	/*
	 * MOTION
	 *
	 * Deux animations au chargement, et elles ne se jouent qu une fois.
	 *
	 * `enter` echelonne l entree de la couverture dans l ordre de lecture :
	 * titre, accroche, chiffres, commandes, accent. C est la seule choregraphie
	 * de la page, elle dure moins d une seconde au total.
	 *
	 * `drop` fait tomber la colonne des resultats ligne par ligne, comme le soir
	 * d un scrutin : le geste dit ce que la section dit, les resultats arrivent
	 * apres l estimation.
	 *
	 * Dans les deux cas l etat de base est l etat final et `backwards` ne masque
	 * l element que pendant son delai : sans animation, tout se lit tel quel.
	 */
	@keyframes drop-in {
		from {
			opacity: 0;
			transform: translateY(-0.4rem);
		}
	}

	.drop {
		animation: drop-in 420ms cubic-bezier(0.22, 0.61, 0.36, 1) backwards;
	}

	/*
	 * Les chiffres de l urne, remplis du degrade de marque comme les titres des
	 * documents imprimes. C est le seul endroit de la page ou le degrade sert de
	 * remplissage de texte, et c est ce qui lui garde sa valeur d accent.
	 *
	 * L utilitaire `text-gradient` d `app.css` ne convient pas ici : sa reserve
	 * `@supports` retombe sur `--color-coral-ink`, un correctif de lisibilite
	 * pour fond clair, qui sur le noir ne donnerait que 3,3:1. Le corail de la
	 * charte, lui, y donne 6,75:1.
	 */
	.figure {
		background-image: var(--gradient-brand);
		background-clip: text;
		color: transparent;
	}

	@supports not (background-clip: text) {
		.figure {
			color: var(--color-coral);
		}
	}

	/*
	 * `animation: none` et non une duree nulle : la reinitialisation globale
	 * d `app.css` ecrase la duree en `!important` mais pas le nom, et un delai
	 * subsisterait donc sur un element masque.
	 */
	@media (prefers-reduced-motion: reduce) {
		.drop {
			animation: none;
		}
	}

	/*
	 * La ligne de l equipe defile horizontalement. La scrollbar reste
	 * fonctionnelle (clavier, trackpad, glisser tactile) mais s efface
	 * visuellement : un filet gris sur l aplat noir ne fait qu ajouter du bruit
	 * a une rangee deja lisible par ses cartes.
	 */
	.team-row {
		scrollbar-width: none;
	}

	.team-row::-webkit-scrollbar {
		display: none;
	}
</style>
