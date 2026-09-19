<script lang="ts">
	import Button from '$components/Button.svelte';
	import { LICENSES, LINKS, POLLING, RETENTION, TOUR } from '$lib/shared/site';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	/**
	 * Les cinq regles de publication. Chacune porte sa consequence, y compris
	 * quand elle joue contre nous : une regle dont on ne montre que le benefice
	 * est un argument, pas une methode.
	 */
	const RULES = [
		{
			title: 'On compte, on ne pondère pas',
			body: "Aucun redressement n'est appliqué, même « pour corriger l'échantillon ». Un chiffre affiché est un comptage réel. C'est le reproche central adressé aux instituts privés : nous ne pouvions pas le formuler et le pratiquer.",
			consequence:
				"Nos résultats ne prétendent donc pas représenter la France entière. Ils représentent les personnes rencontrées, décrites telles qu'elles sont."
		},
		{
			title: 'Les non-réponses sont comptées',
			body: "« Sans opinion », refus de répondre et intention de ne pas voter sont des modalités de plein droit. Elles apparaissent dans chaque graphique et pèsent dans la base de calcul des pourcentages.",
			consequence:
				"Invisibiliser l'abstention et les non-réponses revient à falsifier l'état réel de la société. Dans notre code, la non-réponse n'est pas un cas particulier : c'est une réponse comme une autre."
		},
		{
			title: 'Les effectifs accompagnent les parts',
			body: "Chaque pourcentage voyage avec son effectif brut et sa base. Un « 62 % » calculé sur douze personnes s'affiche avec ses douze personnes.",
			consequence: "Vous pouvez juger de la solidité d'un chiffre sans nous croire sur parole."
		},
		{
			title: 'La formulation exacte est affichée',
			body: 'Le libellé posé sur le terrain apparaît avec chaque graphique, mot pour mot, sans reformulation.',
			consequence:
				"La manière de poser une question fait partie du résultat. Bourdieu appelait cela l'imposition de problématiques ; le minimum est de vous montrer la nôtre."
		},
		{
			title: 'Aucune question achetée',
			body: "L'association ne vend pas de question et n'accepte pas de commanditaire. Le financement vient des dons et des adhésions.",
			consequence: "Personne ne peut acheter la formulation qui l'arrange."
		}
	];
</script>

<svelte:head>
	<title>Méthodologie, Humanitour</title>
	<meta
		name="description"
		content="Comment Humanitour collecte, calcule et publie. Aucun redressement, non-réponses comptées, données brutes ouvertes."
	/>
</svelte:head>

<div class="bg-paper">
	<div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
		<header>
			<h1 class="max-w-3xl text-4xl sm:text-5xl">
				Comment nous mesurons, et ce que nous ne faisons pas
			</h1>
			<p class="measure mt-6 text-lg leading-relaxed">
				Reprocher l'opacité aux autres oblige à une contrainte simple : tout ce qui suit doit être
				vérifiable. Ces règles ne sont pas des intentions, ce sont des contraintes écrites dans un
				code public.
			</p>
		</header>

		<!--
			Les cinq regles. Presentees en liste de definitions et non en cartes
			numerotees : elles s appliquent toutes en meme temps, ce n est pas une
			procedure en cinq etapes.
		-->
		<section class="mt-14" aria-labelledby="regles">
			<h2 id="regles">Nos règles</h2>

			<div class="divide-ink/12 mt-8 flex flex-col divide-y">
				{#each RULES as rule (rule.title)}
					<div class="grid gap-3 py-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-10">
						<h3 class="text-xl font-semibold">{rule.title}</h3>
						<div>
							<p class="measure leading-relaxed">{rule.body}</p>
							<!-- Le filet corail ne decore pas : il isole ce que la regle coute,
							     pour qu on ne lise pas l avantage sans la contrepartie. -->
							<p class="border-coral measure text-ink-soft mt-4 border-l-4 pl-4 leading-relaxed">
								{rule.consequence}
							</p>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<!-- La collecte, limites comprises. -->
		<section class="bg-cream rounded-block mt-16 p-8 sm:p-12" aria-labelledby="collecte">
			<h2 id="collecte">La collecte</h2>
			<p class="measure mt-6 leading-relaxed">
				Les entretiens ont été menés en face-à-face, sur la voie publique et dans les commerces, le
				long d'un parcours à vélo de {TOUR.kilometres.toLocaleString('fr-FR')} kilomètres traversant
				les {TOUR.regions} régions métropolitaines. Il n'y a eu ni panel, ni recrutement par courriel,
				ni rémunération des répondants.
			</p>
			<p class="measure mt-5 leading-relaxed">
				Cette méthode a ses limites, et nous les énonçons : rencontrer les gens dehors
				surreprésente celles et ceux qui sortent, et un parcours à vélo suit des routes, pas une
				carte de la population. Chaque enquête publie sa propre note de méthodologie avec ses
				limites connues.
			</p>
			<p class="measure mt-5 leading-relaxed">
				L'association applique le {POLLING.code}. Les sondages électoraux relèvent du contrôle de la
				<a
					class="underline decoration-2 underline-offset-2"
					href={POLLING.commissionUrl}
					target="_blank"
					rel="noopener noreferrer">Commission des sondages</a
				>.
			</p>
		</section>

		<!-- L anonymat, sur aplat noir : c est la contrainte la plus dure du produit. -->
		<section class="bg-ink text-paper rounded-block mt-8 p-8 sm:p-12" aria-labelledby="anonymat">
			<h2 id="anonymat">Pourquoi certaines cases sont masquées</h2>
			<p class="measure mt-6 leading-relaxed opacity-85">
				Une opinion politique est une donnée sensible au sens du RGPD. Croiser une région, une
				tranche d'âge, une profession et une intention de vote peut suffire à reconnaître quelqu'un
				dans une petite commune. Deux protections s'appliquent donc.
			</p>

			<div class="mt-10 grid gap-8 sm:grid-cols-2">
				<div>
					<h3 class="text-lg font-semibold">Le seuil d'effectif</h3>
					<p class="mt-2 leading-relaxed opacity-80">
						Toute case portant sur moins de {data.threshold} répondants n'est pas publiée. Elle s'affiche
						comme « effectif insuffisant » au lieu du chiffre.
					</p>
				</div>
				<div>
					<h3 class="text-lg font-semibold">La protection contre la soustraction</h3>
					<p class="mt-2 leading-relaxed opacity-80">
						Masquer une seule case ne sert à rien : elle se retrouve en soustrayant les autres du
						total. Quand c'est le cas, une seconde case est masquée. Sans cette deuxième passe, le
						masquage donne l'illusion de la protection.
					</p>
				</div>
			</div>

			<p class="measure mt-8 text-sm leading-relaxed opacity-75">
				Les exports bruts suivent la même logique : ils contiennent les tranches et non les valeurs
				exactes, et les réponses en texte libre en sont exclues, parce qu'un verbatim identifie son
				auteur par son contenu.
			</p>
		</section>

		<!-- Conservation et licences. -->
		<section class="mt-16 grid gap-12 lg:grid-cols-2 lg:gap-16" aria-labelledby="conservation">
			<div>
				<h2 id="conservation">Conservation</h2>
				<dl class="divide-ink/12 mt-6 flex flex-col divide-y">
					<div class="flex justify-between gap-4 py-3">
						<dt>Réponses brutes d'enquête</dt>
						<dd class="tabular font-semibold">{RETENTION.rawSurveyMonths} mois</dd>
					</div>
					<div class="flex justify-between gap-4 py-3">
						<dt>Notes de méthodologie</dt>
						<dd class="tabular font-semibold">{RETENTION.methodologyYears} ans</dd>
					</div>
					<div class="flex justify-between gap-4 py-3">
						<dt>Sessions de connexion</dt>
						<dd class="tabular font-semibold">{RETENTION.sessionDays} jours</dd>
					</div>
					<div class="flex justify-between gap-4 py-3">
						<dt>Comptes inactifs</dt>
						<dd class="tabular font-semibold">{RETENTION.inactiveAccountMonths} mois</dd>
					</div>
				</dl>
			</div>

			<div>
				<h2>Réutilisation</h2>
				<p class="measure mt-6 leading-relaxed">
					Les données publiées sont sous
					<a
						class="underline decoration-2 underline-offset-2"
						href={LICENSES.data.url}
						target="_blank"
						rel="noopener noreferrer">{LICENSES.data.name}</a
					> : réutilisation libre, attribution obligatoire, partage à l'identique.
				</p>
				<p class="measure mt-4 leading-relaxed">
					La plateforme elle-même est sous
					<a
						class="underline decoration-2 underline-offset-2"
						href={LICENSES.code.url}
						target="_blank"
						rel="noopener noreferrer">{LICENSES.code.name}</a
					>. Quiconque en héberge une version modifiée doit en publier le code : un outil qui
					dénonce l'opacité ne peut pas être refermable.
				</p>
				<div class="mt-8 flex flex-wrap gap-3">
					<Button href="/donnees">Voir les données</Button>
					<Button href={LINKS.repository.href} external variant="outline">Auditer le code</Button>
				</div>
			</div>
		</section>
	</div>
</div>
