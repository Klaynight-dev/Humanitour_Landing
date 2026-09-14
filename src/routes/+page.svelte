<script lang="ts">
	import Button from '$components/Button.svelte';
	import Logo from '$components/Logo.svelte';
	import MeshShader from '$components/MeshShader.svelte';
	import Stat from '$components/Stat.svelte';
	import { LINKS, SITE } from '$lib/shared/site';

	/** Les trois mots de la plaquette de presentation (source/Post sondage). */
	const PILLARS = [
		{ word: 'Terrain', body: 'En vélo, à travers les campagnes.' },
		{ word: 'Humain', body: 'Au cœur de la vie des habitantes et des habitants.' },
		{ word: 'Citoyen', body: 'Avec des échanges documentés.' }
	];

	/** Les trois biais releves par Bourdieu en 1972 (source/Constat Humanitour). */
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

	/**
	 * L'etat des lieux du dossier « Constat Humanitour », repris tel quel.
	 * Une couleur de la charte par famille, dans l'ordre du degrade.
	 */
	const INDICTMENT = [
		{
			title: 'Dérives éthiques',
			border: 'border-pink-400',
			items: [
				"Confusion entre sondages d'opinion et de consommation, qui partagent les mêmes panels et un objectif publicitaire.",
				'Marchandisation de la participation : des cadeaux incitent à répondre à plusieurs sondages et altèrent la sincérité.',
				'Revente des données personnelles à des tiers.'
			]
		},
		{
			title: 'Biais méthodologiques',
			border: 'border-coral-500',
			items: [
				"Formulaires en ligne remplis par des volontaires, qui excluent une partie de la population, les « sans opinion » et l'abstention.",
				'Questions achetées et orientées par des commanditaires, dont la formulation sert des intérêts privés.',
				'Opacité sur les données brutes, les redressements et les algorithmes.'
			]
		},
		{
			title: 'Péril démocratique',
			border: 'border-orange-500',
			items: [
				"Invisibilisation des non-réponses et de l'abstention, alors que c'est un indicateur politique majeur.",
				"Fabrication de l'opinion : orienter le débat plutôt que de l'écouter.",
				'Rupture de confiance, avec des résultats perçus comme déconnectés du terrain.'
			]
		}
	];

	/**
	 * Libelles de la plaquette publique. L'export du formulaire pilote
	 * (source/Sondage_citoyen_prive) les pose autrement, « pour quel parti » au
	 * lieu de « pour qui » : a trancher avant mise en production.
	 */
	const QUESTIONS = [
		'Quelle est votre priorité pour la France ?',
		'Au premier tour, pour qui allez-vous voter ?',
		'Au second tour, pour qui ne voterez-vous jamais ?'
	];

	const GUARANTEES = [
		{
			title: 'Les non-réponses sont comptées',
			body: "« Sans opinion », refus et abstention sont des modalités de plein droit. Les effacer reviendrait à falsifier l'état réel de la société."
		},
		{
			title: 'Aucun redressement',
			body: "Un chiffre affiché est un comptage réel. Aucune pondération, aucune correction silencieuse de l'échantillon."
		},
		{
			title: 'Les effectifs accompagnent les parts',
			body: "Chaque pourcentage voyage avec son effectif brut. Un « 62 % » calculé sur douze personnes n'est pas un résultat."
		},
		{
			title: 'La formulation exacte est affichée',
			body: 'Le libellé posé sur le terrain apparaît avec chaque graphique, parce que la formulation fait partie du résultat.'
		}
	];

	const SUPPORT = [
		'Des statistiques chaque jour, pour suivre le tour depuis chez toi.',
		'Des données ouvertes, pour démocratiser les sondages.',
		'Des échanges enregistrés et diffusés, pour entendre les voix derrière les chiffres.',
		'Un projet associatif ouvert, que tu peux rejoindre.'
	];
</script>

<svelte:head>
	<title>{SITE.name} - {SITE.tagline}</title>
	<meta name="description" content={SITE.description} />
	<meta property="og:title" content="{SITE.name} - {SITE.tagline}" />
	<meta property="og:description" content={SITE.description} />
	<meta property="og:type" content="website" />
</svelte:head>

<!-- Hero -->
<section class="border-ink relative overflow-hidden border-b-2" aria-labelledby="titre">
	<div class="surface-mesh absolute inset-0" aria-hidden="true"></div>
	<MeshShader />

	<div class="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
		<div class="brut rounded-pill mb-8 inline-flex items-center gap-3 bg-white px-4 py-2">
			<Logo size={28} />
			<span class="font-display text-xs font-bold tracking-[0.18em] uppercase">
				{SITE.tagline}
			</span>
		</div>

		<h1
			id="titre"
			class="font-display max-w-4xl text-4xl leading-[0.95] font-black tracking-tighter wrap-break-word uppercase sm:text-7xl lg:text-8xl"
		>
			Les sondages disent-ils la vérité&nbsp;?
		</h1>

		<p class="mt-8 max-w-2xl text-lg font-medium sm:text-xl">
			On va aller vérifier. Deux mois sur la route, des entretiens en face-à-face, et la totalité
			du matériau publiée.
		</p>

		<div class="mt-9 flex flex-wrap gap-3">
			<Button href="/donnees" size="lg">Explorer les données</Button>
			<Button href={LINKS.forms.href} external size="lg" variant="outline">
				Répondre au sondage
			</Button>
		</div>

		<p class="font-hand mt-10 text-3xl">et oui, aucun milliardaire ne nous dit quoi faire&nbsp;!</p>
	</div>
</section>

<!-- Les trois mots de la plaquette -->
<section class="border-ink border-b-2" aria-label="Notre méthode en trois mots">
	<div class="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
		{#each PILLARS as pillar (pillar.word)}
			<div class="border-ink min-w-0 border-t-2 pt-4">
				<h2 class="font-display text-2xl font-black tracking-tight uppercase">{pillar.word}</h2>
				<p class="text-ink-soft mt-1 text-sm">{pillar.body}</p>
			</div>
		{/each}
	</div>
</section>

<!-- Bourdieu, en grand -->
<section class="border-ink bg-ink border-b-2 text-white" aria-labelledby="bourdieu">
	<div class="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-28">
		<p class="text-pink-400 font-display text-xs font-bold tracking-[0.2em] uppercase">
			Pierre Bourdieu, 1972
		</p>
		<h2
			id="bourdieu"
			class="font-display mt-4 max-w-4xl text-3xl leading-[0.95] font-black tracking-tighter wrap-break-word uppercase sm:text-6xl lg:text-7xl"
		>
			L'opinion publique n'existe pas.
		</h2>
		<blockquote class="mt-10 max-w-3xl border-l-4 border-white/30 pl-6 text-lg text-white/80 sm:text-xl">
			« L'effet fondamental du sondage d'opinion est de constituer l'illusion qu'il existe une
			opinion publique unanime, pour légitimer une politique. »
			<footer class="mt-3 text-sm font-semibold text-white/60">Pierre Bourdieu, 1980</footer>
		</blockquote>
	</div>
</section>

<!-- Le constat -->
<section class="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24" aria-labelledby="constat">
	<div class="max-w-3xl">
		<p class="text-coral-700 font-display text-xs font-bold tracking-[0.2em] uppercase">
			Le constat
		</p>
		<h2
			id="constat"
			class="font-display mt-3 text-3xl font-black tracking-tighter wrap-break-word uppercase sm:text-5xl"
		>
			<span class="text-gradient">Trois biais, cinquante ans plus tard</span>
		</h2>
		<p class="text-ink-soft mt-6 text-lg">
			En 1972, le sociologue Pierre Bourdieu met en garde : les sondages fabriquent l'opinion au
			lieu de la mesurer. Il relève trois biais majeurs. Un demi-siècle plus tard, ils sont devenus
			des méthodes.
		</p>
	</div>

	<ol class="border-ink mt-12 border-t-2">
		{#each BIASES as bias, index (bias.title)}
			<li class="border-ink grid gap-3 border-b-2 py-8 sm:grid-cols-[auto_1fr] sm:gap-10">
				<span class="tabular text-coral-600 text-4xl leading-none font-bold sm:text-5xl">
					0{index + 1}
				</span>
				<div class="min-w-0">
					<h3 class="font-display text-xl font-bold sm:text-2xl">{bias.title}</h3>
					<p class="text-ink-soft mt-2 max-w-2xl">{bias.body}</p>
				</div>
			</li>
		{/each}
	</ol>
</section>

<!-- Etat des lieux -->
<section class="border-ink bg-surface border-y-2" aria-labelledby="secrets">
	<div class="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
		<div class="max-w-3xl">
			<p class="text-coral-700 font-display text-xs font-bold tracking-[0.2em] uppercase">
				État des lieux
			</p>
			<h2
				id="secrets"
				class="font-display mt-3 text-3xl font-black tracking-tighter wrap-break-word uppercase sm:text-5xl"
			>
				Leurs petits secrets
			</h2>
			<p class="text-ink-soft mt-6 text-lg">
				Les sondages que vous lisez ne viennent pas d'institutions indépendantes. Ils viennent
				d'entreprises privées à but lucratif (Ifop, Ipsos, Elabe, OpinionWay, BVA), détenues par
				des fonds financiers ou des milliardaires, souvent propriétaires des médias qui les
				commandent.
			</p>
		</div>

		<div class="mt-12 grid gap-8 md:grid-cols-3">
			{#each INDICTMENT as group (group.title)}
				<div class="min-w-0 border-t-4 pt-5 {group.border}">
					<h3 class="font-display text-xl font-bold">{group.title}</h3>
					<ul class="mt-4 flex flex-col gap-3">
						{#each group.items as item (item)}
							<li class="text-ink-soft flex gap-3 text-sm leading-relaxed">
								<span class="bg-ink mt-2 h-1.5 w-1.5 shrink-0" aria-hidden="true"></span>
								<span>{item}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>

		<p class="font-hand mt-12 text-3xl">Vous y croyez&nbsp;?</p>
	</div>
</section>

<!-- Ce qu'on fait a la place -->
<section class="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24" aria-labelledby="methode">
	<div class="max-w-3xl">
		<p class="text-coral-700 font-display text-xs font-bold tracking-[0.2em] uppercase">
			Notre réponse
		</p>
		<h2
			id="methode"
			class="font-display mt-3 text-3xl font-black tracking-tighter wrap-break-word uppercase sm:text-5xl"
		>
			Ce qu'on fait à la place
		</h2>
		<p class="text-ink-soft mt-6 text-lg">
			Un échantillon ne se recrute pas par courriel auprès de volontaires rémunérés : il se
			rencontre. Le parcours traverse toutes les régions métropolitaines pour aller chercher celles
			et ceux que les panels en ligne n'atteignent jamais, en vue de la présidentielle.
		</p>
	</div>

	<div class="border-ink mt-12 grid grid-cols-2 gap-8 border-y-2 py-10 lg:grid-cols-4">
		<Stat value="5 000 km" label="À vélo" hint="En deux mois, sans interruption" />
		<Stat value="13" label="Régions" hint="Toutes les métropolitaines, Corse comprise" />
		<Stat value="3" label="Questions" hint="Posées à l'identique partout" />
		<Stat value="0" label="Panel en ligne" hint="Aucun recrutement par courriel" />
	</div>

	<div class="brut rounded-card bg-paper mt-12 max-w-3xl p-6 sm:p-8">
		<p class="font-display text-muted text-[11px] font-bold tracking-[0.15em] uppercase">
			Les trois questions posées
		</p>
		<ol class="mt-6 flex flex-col gap-5">
			{#each QUESTIONS as question, index (question)}
				<li class="flex gap-4">
					<span class="tabular text-coral-600 shrink-0 text-2xl font-bold">{index + 1}</span>
					<span class="font-display min-w-0 text-lg leading-snug font-bold">{question}</span>
				</li>
			{/each}
		</ol>
	</div>

	<div class="mt-8 flex flex-wrap gap-3">
		<Button href="/le-tour" size="lg">Suivre le tour</Button>
		<Button href="/donnees" size="lg" variant="outline">Voir les résultats</Button>
	</div>
</section>

<!-- Garanties -->
<section class="border-ink bg-ink border-y-2 text-white" aria-labelledby="garanties">
	<div class="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
		<div class="max-w-3xl">
			<p class="text-pink-400 font-display text-xs font-bold tracking-[0.2em] uppercase">
				Transparence
			</p>
			<h2
				id="garanties"
				class="font-display mt-3 text-3xl font-black tracking-tighter wrap-break-word uppercase sm:text-5xl"
			>
				Nos garanties sont écrites dans le code
			</h2>
			<p class="mt-6 text-lg text-white/80">
				Ce ne sont pas des intentions : ce sont des contraintes techniques, vérifiables dans un
				dépôt public. Reprocher l'opacité aux autres oblige à rendre la sienne impossible.
			</p>
		</div>

		<div class="mt-12 grid gap-5 sm:grid-cols-2">
			{#each GUARANTEES as guarantee (guarantee.title)}
				<div class="rounded-card min-w-0 border-2 border-white/25 p-6">
					<h3 class="font-display text-lg font-bold">{guarantee.title}</h3>
					<p class="mt-2 text-sm leading-relaxed text-white/75">{guarantee.body}</p>
				</div>
			{/each}
		</div>

		<div class="mt-10 flex flex-wrap gap-3">
			<a
				href="/methodologie"
				class="font-display rounded-pill inline-flex items-center border-2 border-white bg-white px-6 py-3 text-sm font-bold text-black"
			>
				Lire la méthodologie
			</a>
			<a
				href={LINKS.repository.href}
				target="_blank"
				rel="noopener noreferrer"
				class="font-display rounded-pill inline-flex items-center border-2 border-white/40 px-6 py-3 text-sm font-bold transition-colors hover:bg-white/10"
			>
				Auditer le code source
			</a>
		</div>
	</div>
</section>

<!-- Soutien -->
<section class="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24" aria-labelledby="soutien">
	<div class="brut surface-mesh rounded-card px-6 py-14 sm:px-12">
		<div class="max-w-2xl">
			<h2
				id="soutien"
				class="font-display text-2xl font-black tracking-tighter wrap-break-word uppercase sm:text-5xl"
			>
				L'opinion publique n'est pas une marchandise
			</h2>
			<p class="mt-6 text-lg font-medium">
				Soutiens un média citoyen, qui t'appartient : le projet est associatif et ouvert. Pas de
				publicité, pas de revente de données, pas d'actionnaire à satisfaire.
			</p>

			<ul class="mt-8 flex flex-col gap-3 font-medium">
				{#each SUPPORT as item (item)}
					<li class="flex gap-3">
						<span aria-hidden="true">◆</span>
						<span>{item}</span>
					</li>
				{/each}
			</ul>

			<div class="mt-9 flex flex-wrap gap-3">
				<Button href={LINKS.helloasso.href} external size="lg">Soutenir sur HelloAsso</Button>
				<Button href={LINKS.discord.href} external size="lg" variant="outline">
					Rejoindre le Discord
				</Button>
			</div>

			<p class="font-hand mt-10 text-3xl">Et toi, t'aurais répondu quoi&nbsp;?</p>
		</div>
	</div>
</section>
