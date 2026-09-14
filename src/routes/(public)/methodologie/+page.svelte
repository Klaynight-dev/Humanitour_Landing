<script lang="ts">
	import Button from '$components/Button.svelte';
	import { LICENSES, LINKS, POLLING, RETENTION } from '$lib/shared/site';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const RULES = [
		{
			title: 'On compte, on ne pondere pas',
			body: "Aucun redressement n'est applique, meme « pour corriger l'echantillon ». Un chiffre affiche est un comptage reel. C'est le reproche central adresse aux instituts prives : nous ne pouvions pas le formuler et le pratiquer.",
			consequence:
				"Nos resultats ne pretendent donc pas representer la France entiere. Ils representent les personnes rencontrees, decrites telles qu'elles sont."
		},
		{
			title: 'Les non-reponses sont comptees',
			body: "« Sans opinion », refus de repondre et intention de ne pas voter sont des modalites de plein droit. Elles apparaissent dans chaque graphique et pesent dans la base de calcul des pourcentages.",
			consequence:
				"Invisibiliser l'abstention et les non-reponses revient a falsifier l'etat reel de la societe. Dans notre code, la non-reponse n'est pas un cas particulier : elle est une reponse comme une autre."
		},
		{
			title: 'Les effectifs accompagnent les parts',
			body: "Chaque pourcentage voyage avec son effectif brut et sa base. Un « 62 % » calcule sur douze personnes s'affiche avec ses douze personnes.",
			consequence: "Vous pouvez juger de la solidite d'un chiffre sans nous croire sur parole."
		},
		{
			title: 'La formulation exacte est affichee',
			body: "Le libelle pose sur le terrain apparait avec chaque graphique, mot pour mot, sans reformulation.",
			consequence:
				"La maniere de poser une question fait partie du resultat. Bourdieu appelait cela l'imposition de problematiques ; le minimum est de vous montrer la notre."
		},
		{
			title: 'Aucune question achetee',
			body: "L'association ne vend pas de question et n'accepte pas de commanditaire. Le financement vient des dons et des adhesions.",
			consequence: "Personne ne peut acheter la formulation qui l'arrange."
		}
	];
</script>

<svelte:head>
	<title>Méthodologie — Humanitour</title>
	<meta
		name="description"
		content="Comment Humanitour collecte, calcule et publie. Aucun redressement, non-réponses comptées, données brutes ouvertes."
	/>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-14 sm:px-6">
	<header class="max-w-3xl">
		<p class="text-coral-600 text-sm font-semibold tracking-[0.2em] uppercase">Méthodologie</p>
		<h1 class="font-display mt-3 text-4xl font-semibold sm:text-5xl">
			Comment nous mesurons, et ce que nous ne faisons pas
		</h1>
		<p class="text-ink-soft mt-5 text-lg">
			Reprocher l'opacité aux autres oblige à une contrainte simple : tout ce qui suit doit être
			vérifiable. Nos règles ne sont pas des intentions, ce sont des contraintes écrites dans un
			code public.
		</p>
	</header>

	<!-- Les regles -->
	<section class="mt-14" aria-labelledby="regles">
		<h2 id="regles" class="font-display text-3xl font-semibold">Nos règles</h2>

		<ol class="mt-8 flex flex-col gap-5">
			{#each RULES as rule, index (rule.title)}
				<li class="brut bg-paper rounded-card p-6 sm:p-7">
					<div class="flex items-baseline gap-4">
						<span class="text-coral-500 font-display tabular text-2xl font-semibold">
							0{index + 1}
						</span>
						<h3 class="font-display text-xl font-semibold">{rule.title}</h3>
					</div>
					<p class="text-ink-soft mt-3">{rule.body}</p>
					<p class="border-coral-200 text-ink-soft mt-3 border-l-2 pl-4 text-sm">
						{rule.consequence}
					</p>
				</li>
			{/each}
		</ol>
	</section>

	<!-- Collecte -->
	<section class="mt-16 max-w-3xl" aria-labelledby="collecte">
		<h2 id="collecte" class="font-display text-3xl font-semibold">La collecte</h2>
		<p class="text-ink-soft mt-4">
			Les entretiens se font en face-à-face, sur la voie publique et dans les commerces, le long
			d'un parcours à vélo de 5 000 kilomètres traversant les régions métropolitaines. Il n'y a ni
			panel, ni recrutement par courriel, ni rémunération des répondants.
		</p>
		<p class="text-ink-soft mt-4">
			Cette méthode a ses limites, et nous les énonçons : rencontrer les gens dehors surreprésente
			celles et ceux qui sortent, et un parcours à vélo suit des routes, pas une carte de la
			population. Chaque enquête publie sa propre note de méthodologie avec ses limites connues.
		</p>
		<p class="text-ink-soft mt-4">
			L'association applique le {POLLING.code}. Les sondages électoraux relèvent du contrôle de la
			<a
				class="underline"
				href={POLLING.commissionUrl}
				target="_blank"
				rel="noopener noreferrer">Commission des sondages</a
			>.
		</p>
	</section>

	<!-- Anonymat -->
	<section class="bg-ink text-paper rounded-card mt-16 p-8 sm:p-10" aria-labelledby="anonymat">
		<h2 id="anonymat" class="font-display text-3xl font-semibold">
			Pourquoi certaines cases sont masquées
		</h2>
		<p class="mt-4 max-w-3xl text-white/80">
			Une opinion politique est une donnée sensible au sens du RGPD. Croiser une région, une
			tranche d'âge, une profession et une intention de vote peut suffire à reconnaître quelqu'un
			dans une petite commune. Nous appliquons donc deux protections.
		</p>

		<div class="mt-8 grid gap-5 sm:grid-cols-2">
			<div class="rounded-card border border-white/15 p-6">
				<h3 class="font-display text-lg font-semibold">Le seuil d'effectif</h3>
				<p class="mt-2 text-sm leading-relaxed text-white/75">
					Toute case portant sur moins de {data.threshold} répondants n'est pas publiée. Elle
					s'affiche comme « effectif insuffisant » au lieu du chiffre.
				</p>
			</div>
			<div class="rounded-card border border-white/15 p-6">
				<h3 class="font-display text-lg font-semibold">La protection contre la soustraction</h3>
				<p class="mt-2 text-sm leading-relaxed text-white/75">
					Masquer une seule case ne sert à rien : elle se retrouve en soustrayant les autres du
					total. Quand c'est le cas, une seconde case est masquée. Sans cette deuxième passe, le
					masquage donne l'illusion de la protection.
				</p>
			</div>
		</div>

		<p class="mt-6 max-w-3xl text-sm text-white/70">
			Les exports bruts suivent la même logique : ils contiennent les tranches et non les valeurs
			exactes, et les réponses en texte libre en sont exclues, parce qu'un verbatim identifie son
			auteur par son contenu.
		</p>
	</section>

	<!-- Conservation et licences -->
	<section class="mt-16 grid gap-10 lg:grid-cols-2" aria-labelledby="donnees">
		<div>
			<h2 id="donnees" class="font-display text-3xl font-semibold">Conservation</h2>
			<dl class="mt-6 flex flex-col gap-3 text-sm">
				<div class="border-ink flex justify-between gap-4 border-b-2 pb-3">
					<dt class="text-ink-soft">Réponses brutes d'enquête</dt>
					<dd class="tabular font-semibold">{RETENTION.rawSurveyMonths} mois</dd>
				</div>
				<div class="border-ink flex justify-between gap-4 border-b-2 pb-3">
					<dt class="text-ink-soft">Notes de méthodologie</dt>
					<dd class="tabular font-semibold">{RETENTION.methodologyYears} ans</dd>
				</div>
				<div class="border-ink flex justify-between gap-4 border-b-2 pb-3">
					<dt class="text-ink-soft">Sessions de connexion</dt>
					<dd class="tabular font-semibold">{RETENTION.sessionDays} jours</dd>
				</div>
				<div class="flex justify-between gap-4">
					<dt class="text-ink-soft">Comptes inactifs</dt>
					<dd class="tabular font-semibold">{RETENTION.inactiveAccountMonths} mois</dd>
				</div>
			</dl>
		</div>

		<div>
			<h2 class="font-display text-3xl font-semibold">Réutilisation</h2>
			<p class="text-ink-soft mt-6">
				Les données publiées sont sous
				<a class="underline" href={LICENSES.data.url} target="_blank" rel="noopener noreferrer">
					{LICENSES.data.name}
				</a> : réutilisation libre, attribution obligatoire, partage à l'identique.
			</p>
			<p class="text-ink-soft mt-4">
				La plateforme elle-même est sous
				<a class="underline" href={LICENSES.code.url} target="_blank" rel="noopener noreferrer">
					{LICENSES.code.name}
				</a>. Quiconque en héberge une version modifiée doit en publier le code : un outil qui
				dénonce l'opacité ne peut pas être refermable.
			</p>
			<div class="mt-7 flex flex-wrap gap-3">
				<Button href="/donnees">Voir les données</Button>
				<Button href={LINKS.repository.href} external variant="outline">Auditer le code</Button>
			</div>
		</div>
	</section>
</div>
