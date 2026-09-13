<script lang="ts">
	import Button from '$components/Button.svelte';
	import Stat from '$components/Stat.svelte';
	import { LINKS, SITE } from '$lib/shared/site';

	/** Les trois biais identifies par Bourdieu en 1972. */
	const BIASES = [
		{
			title: "L'imposition de problematiques",
			body: "Les sondages posent des questions artificielles, que les gens ne se posent pas forcement."
		},
		{
			title: "L'illusion de la reponse universelle",
			body: "Les individus sont incites a repondre meme s'ils ne comprennent pas la question."
		},
		{
			title: 'La fabrication d un consensus',
			body: "Les « non-reponses » sont ignorees et creent l'illusion d'une opinion publique unanime."
		}
	];

	/** La comparaison, telle qu elle figure dans les documents de l association. */
	const COMPARISON = [
		{
			them: 'Controles par les milliardaires',
			themDetail: 'Proprietaires des instituts et des medias.',
			us: 'Association loi 1901',
			usDetail: 'Aucun commanditaire prive, aucune question achetee.'
		},
		{
			them: 'Echantillons biaises',
			themDetail: 'Par courriel, aupres de personnes deja inscrites et remunerees.',
			us: 'Rencontres sur le terrain',
			usDetail: 'En face-a-face, a velo, dans toutes les regions metropolitaines.'
		},
		{
			them: 'Chiffres manipules',
			themDetail: 'Donnees brutes non publiees, resultats redresses.',
			us: 'Donnees brutes publiees',
			usDetail: 'Export libre, aucun redressement, non-reponses comptees.'
		}
	];

	const GUARANTEES = [
		{
			title: 'Les non-reponses sont comptees',
			body: "« Sans opinion », refus et abstention sont des modalites de plein droit. Les effacer reviendrait a falsifier l'etat reel de la societe."
		},
		{
			title: 'Aucun redressement',
			body: 'Un chiffre affiche est un comptage reel. Aucune ponderation, aucune correction silencieuse de l echantillon.'
		},
		{
			title: 'Les effectifs accompagnent les parts',
			body: "Chaque pourcentage voyage avec son effectif brut. Un « 62 % » sur douze personnes n'est pas un resultat."
		},
		{
			title: 'La formulation exacte est affichee',
			body: "Le libelle pose sur le terrain apparait avec chaque graphique, parce que la formulation fait partie du resultat."
		}
	];
</script>

<svelte:head>
	<title>{SITE.name} — {SITE.tagline}</title>
	<meta name="description" content={SITE.description} />
	<meta property="og:title" content="{SITE.name} — {SITE.tagline}" />
	<meta property="og:description" content={SITE.description} />
	<meta property="og:type" content="website" />
</svelte:head>

<!-- Hero -->
<section class="surface-mesh relative overflow-hidden">
	<div class="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:py-36">
		<p class="text-ink/80 mb-4 text-sm font-semibold tracking-[0.2em] uppercase">
			{SITE.tagline}
		</p>

		<h1 class="font-display max-w-4xl text-5xl leading-[1.05] font-semibold sm:text-6xl lg:text-7xl">
			Les sondages<br />disent-ils la verite&nbsp;?
		</h1>

		<p class="text-ink/90 mt-6 max-w-2xl text-lg sm:text-xl">
			On va aller verifier. Sur le terrain, a velo, a travers les campagnes. Au coeur de la vie des
			habitantes et des habitants, avec des echanges documentes.
		</p>

		<div class="mt-9 flex flex-wrap gap-3">
			<Button href="/donnees" size="lg">Explorer les donnees</Button>
			<Button href="/methodologie" size="lg" variant="outline">Notre methodologie</Button>
		</div>

		<p class="font-hand text-ink/80 mt-8 text-2xl">
			et oui, aucun milliardaire ne nous dit quoi faire&nbsp;!
		</p>
	</div>
</section>

<!-- Chiffres du tour -->
<section class="border-line border-b" aria-label="Le tour en chiffres">
	<div class="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 lg:grid-cols-4">
		<Stat value="5 000 km" label="A velo" hint="A travers les regions metropolitaines" />
		<Stat value="2 mois" label="Sur le terrain" hint="En continu, au contact des habitants" />
		<Stat value="3" label="Questions" hint="Simples, posees a l'identique partout" />
		<Stat value="100 %" label="Donnees ouvertes" hint="Export brut, sans compte" />
	</div>
</section>

<!-- Le constat -->
<section class="mx-auto max-w-6xl px-4 py-20 sm:px-6" aria-labelledby="constat">
	<div class="max-w-3xl">
		<p class="text-coral-600 text-sm font-semibold tracking-[0.2em] uppercase">Le constat</p>
		<h2 id="constat" class="font-display mt-3 text-4xl font-semibold sm:text-5xl">
			<span class="text-gradient">L'opinion publique n'existe pas.</span>
		</h2>
		<p class="text-ink-soft mt-5 text-lg">
			En 1972, le sociologue Pierre Bourdieu mettait en garde contre les sondages traditionnels,
			qui selon lui fabriquent l'opinion au lieu de la mesurer. Il identifiait trois biais majeurs.
			Cinquante ans plus tard, la situation s'est aggravee.
		</p>
	</div>

	<ol class="mt-12 grid gap-6 md:grid-cols-3">
		{#each BIASES as bias, index (bias.title)}
			<li class="border-line bg-paper rounded-card border p-6">
				<span class="text-coral-500 font-display tabular text-3xl font-semibold">
					0{index + 1}
				</span>
				<h3 class="mt-3 text-lg font-semibold">{bias.title}</h3>
				<p class="text-ink-soft mt-2 text-sm leading-relaxed">{bias.body}</p>
			</li>
		{/each}
	</ol>

	<figure class="border-coral-500 mt-12 border-l-4 pl-6">
		<blockquote class="font-display text-xl leading-snug sm:text-2xl">
			« L'effet fondamental du sondage d'opinion est de constituer l'illusion qu'il existe une
			opinion publique unanime, pour legitimer une politique. »
		</blockquote>
		<figcaption class="text-muted mt-3 text-sm">Pierre Bourdieu, 1980</figcaption>
	</figure>
</section>

<!-- Comparaison -->
<section class="bg-surface border-line border-y" aria-labelledby="difference">
	<div class="mx-auto max-w-6xl px-4 py-20 sm:px-6">
		<h2 id="difference" class="font-display max-w-2xl text-4xl font-semibold sm:text-5xl">
			Leurs petits secrets, et ce qu'on fait a la place
		</h2>

		<div class="mt-12 grid gap-4">
			{#each COMPARISON as row (row.them)}
				<div class="grid gap-4 md:grid-cols-2">
					<div class="border-line bg-paper rounded-card border p-6 opacity-70">
						<p class="text-muted text-xs font-semibold tracking-wide uppercase">
							Les instituts prives
						</p>
						<h3 class="mt-2 font-semibold line-through decoration-2">{row.them}</h3>
						<p class="text-ink-soft mt-2 text-sm">{row.themDetail}</p>
					</div>
					<div class="border-coral-200 bg-coral-50 rounded-card border-2 p-6">
						<p class="text-coral-700 text-xs font-semibold tracking-wide uppercase">Humanitour</p>
						<h3 class="mt-2 font-semibold">{row.us}</h3>
						<p class="text-ink-soft mt-2 text-sm">{row.usDetail}</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Le tour -->
<section class="mx-auto max-w-6xl px-4 py-20 sm:px-6" aria-labelledby="le-tour">
	<div class="grid items-center gap-12 lg:grid-cols-2">
		<div>
			<p class="text-coral-600 text-sm font-semibold tracking-[0.2em] uppercase">Le tour</p>
			<h2 id="le-tour" class="font-display mt-3 text-4xl font-semibold sm:text-5xl">
				5 000 kilometres, deux mois, toutes les regions
			</h2>
			<p class="text-ink-soft mt-5 text-lg">
				Un echantillon ne se recrute pas par courriel aupres de volontaires remuneres. Il se
				rencontre. Le parcours traverse les regions metropolitaines pour aller chercher celles et
				ceux que les panels en ligne n'atteignent jamais.
			</p>
			<div class="mt-8 flex flex-wrap gap-3">
				<Button href="/le-tour">Suivre le parcours</Button>
				<Button href={LINKS.forms.href} external variant="outline">Repondre au sondage</Button>
			</div>
		</div>

		<div class="border-line bg-surface rounded-card border p-8">
			<p class="text-muted text-xs font-semibold tracking-wide uppercase">
				Les trois questions posees
			</p>
			<ol class="mt-5 flex flex-col gap-5">
				<li class="flex gap-4">
					<span class="text-coral-500 font-display tabular text-2xl font-semibold">1</span>
					<span class="font-display text-lg">Quelle est votre priorite pour la France&nbsp;?</span>
				</li>
				<li class="flex gap-4">
					<span class="text-coral-500 font-display tabular text-2xl font-semibold">2</span>
					<span class="font-display text-lg">
						Au premier tour, pour qui allez-vous voter&nbsp;?
					</span>
				</li>
				<li class="flex gap-4">
					<span class="text-coral-500 font-display tabular text-2xl font-semibold">3</span>
					<span class="font-display text-lg">
						Au second tour, pour qui ne voterez-vous <em>jamais</em>&nbsp;?
					</span>
				</li>
			</ol>
		</div>
	</div>
</section>

<!-- Methodologie -->
<section class="bg-ink text-paper" aria-labelledby="garanties">
	<div class="mx-auto max-w-6xl px-4 py-20 sm:px-6">
		<div class="max-w-3xl">
			<p class="text-coral-500 text-sm font-semibold tracking-[0.2em] uppercase">Transparence</p>
			<h2 id="garanties" class="font-display mt-3 text-4xl font-semibold sm:text-5xl">
				Nos garanties sont ecrites dans le code
			</h2>
			<p class="mt-5 text-lg text-white/80">
				Ce ne sont pas des intentions : ce sont des contraintes techniques, verifiables dans un
				depot public. La plateforme est libre, son code est auditable.
			</p>
		</div>

		<div class="mt-12 grid gap-6 sm:grid-cols-2">
			{#each GUARANTEES as guarantee (guarantee.title)}
				<div class="rounded-card border border-white/15 p-6">
					<h3 class="font-display text-lg font-semibold">{guarantee.title}</h3>
					<p class="mt-2 text-sm leading-relaxed text-white/75">{guarantee.body}</p>
				</div>
			{/each}
		</div>

		<div class="mt-10 flex flex-wrap gap-3">
			<a
				href="/methodologie"
				class="rounded-pill bg-paper text-ink hover:bg-coral-500 inline-flex items-center px-6 py-3 text-sm font-semibold transition-colors hover:text-white"
			>
				Lire la methodologie complete
			</a>
			<a
				href={LINKS.repository.href}
				target="_blank"
				rel="noopener noreferrer"
				class="rounded-pill inline-flex items-center border-2 border-white/30 px-6 py-3 text-sm font-semibold transition-colors hover:bg-white/10"
			>
				Voir le code source
			</a>
		</div>
	</div>
</section>

<!-- Soutien -->
<section class="mx-auto max-w-6xl px-4 py-20 sm:px-6" aria-labelledby="soutien">
	<div class="surface-mesh rounded-card px-6 py-14 sm:px-12">
		<div class="max-w-2xl">
			<h2 id="soutien" class="font-display text-4xl font-semibold sm:text-5xl">
				Soutiens un media citoyen, qui t'appartient
			</h2>
			<p class="text-ink/90 mt-5 text-lg">
				Le projet est associatif et ouvert. Pas de publicite, pas de revente de donnees, pas
				d'actionnaire a satisfaire. Juste des gens qui veulent savoir ce que pensent les autres.
			</p>

			<ul class="mt-8 flex flex-col gap-3">
				<li class="flex gap-3">
					<span aria-hidden="true">◆</span>
					<span>Des statistiques chaque jour, pour suivre le tour depuis chez toi.</span>
				</li>
				<li class="flex gap-3">
					<span aria-hidden="true">◆</span>
					<span>Des donnees ouvertes, pour democratiser les sondages.</span>
				</li>
				<li class="flex gap-3">
					<span aria-hidden="true">◆</span>
					<span>Des echanges enregistres et diffuses, pour entendre les voix derriere les chiffres.</span>
				</li>
			</ul>

			<div class="mt-9 flex flex-wrap gap-3">
				<Button href={LINKS.helloasso.href} external size="lg">Soutenir sur HelloAsso</Button>
				<Button href={LINKS.discord.href} external size="lg" variant="outline">
					Rejoindre le Discord
				</Button>
			</div>

			<p class="font-hand mt-8 text-2xl">Et toi, t'aurais repondu quoi&nbsp;?</p>
		</div>
	</div>
</section>
