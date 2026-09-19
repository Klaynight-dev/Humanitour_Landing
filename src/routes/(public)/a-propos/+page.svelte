<script lang="ts">
	import ContentBlocks from '$components/ContentBlocks.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	import Button from '$components/Button.svelte';
	import { reveal } from '$lib/actions/reveal';
	import {
		HOST,
		INCUBATOR,
		LICENSES,
		LINKS,
		ORGANISATION,
		POLLING,
		SITE,
		TEAM,
		TOUR
	} from '$lib/shared/site';

	/** Les mentions d identite de l association, telles qu elles sont declarees. */
	const IDENTITY = [
		{ term: 'Raison sociale', value: ORGANISATION.legalName },
		{ term: 'Forme', value: ORGANISATION.form },
		{ term: 'RNA', value: ORGANISATION.rna },
		{ term: 'Siège', value: ORGANISATION.address },
		{ term: 'Déclaration', value: ORGANISATION.declaration },
		{ term: 'Directeur de publication', value: ORGANISATION.publicationDirector },
		{ term: 'Hébergeur', value: `${HOST.name}, ${HOST.dataCenter}` }
	];
</script>

<svelte:head>
	<title>À propos, {SITE.name}</title>
	<meta
		name="description"
		content="Les quatre personnes derrière Humanitour, l'association qui les porte, et ce qui la finance."
	/>
	<meta property="og:title" content="À propos, {SITE.name}" />
	<meta property="og:type" content="website" />
</svelte:head>

<!-- Contenu edite au back-office, s'il a ete publie ; sinon la page d'origine. -->
{#if data.blocks}
	<ContentBlocks blocks={data.blocks} />
{:else}

<!--
	Couverture. Les deux autres pages d argument s ouvrent sur le degrade ; celle-ci
	s ouvre sur les visages, parce que c est ce qu elle a de plus caracteristique.
	Le titre est celui de la plaquette.
-->
<section class="bg-cream relative isolate overflow-hidden" aria-labelledby="titre">
	<!-- Les deux aplats organiques de la page, sur sa section creme, aux memes
	     deux coins que partout ailleurs (`app.css`). -->
	<div class="shape-field" aria-hidden="true">
		<span class="shape shape-coral"></span>
		<span class="shape shape-pink"></span>
	</div>

	<div class="relative mx-auto max-w-6xl px-4 pt-14 pb-20 sm:px-6 sm:pt-20 sm:pb-28">
		<!-- Le mot marque, forme `mark-brand` : la surface est claire, l etiquette
		     porte donc le degrade et du texte noir. -->
		<h1 id="titre" class="enter max-w-3xl">
			Un collectif <span class="mark-brand">engagé</span>
		</h1>

		<p class="measure enter mt-7 text-xl font-medium sm:text-2xl" style="--enter-delay: 90ms">
			Quatre personnes, une association loi 1901, et aucun actionnaire. Voilà qui a posé les
			questions sur {TOUR.kilometres.toLocaleString('fr-FR')} kilomètres.
		</p>

		<!--
			Les quatre fiches sont identiques a dessein : ce sont des pairs, et donner
			plus de place a l une d elles laisserait entendre une hierarchie qui
			n existe pas dans l association.
		-->
		<ul class="mt-16 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
			{#each TEAM as member, index (member.slug)}
				<!-- MOTION : les portraits entrent l un apres l autre, une seule fois.
				     C est le seul declenchement au defilement de cette page. -->
				<li use:reveal={index * 110}>
					<!--
						`alt` vide : le nom et la fonction sont juste en dessous, en texte.
						Decrire le portrait par-dessus ne ferait que repeter ce que le
						lecteur d ecran vient d annoncer.
					-->
					<img
						src="/equipe/{member.slug}.jpg"
						alt=""
						width="420"
						height="420"
						loading="lazy"
						class="aspect-square w-40 rounded-full object-cover sm:w-44"
					/>
					<h2 class="mt-5 text-xl font-semibold">{member.name}</h2>
					<p class="text-coral-ink font-semibold">{member.role}</p>
					<p class="text-ink-soft mt-3 leading-relaxed">{member.bio}</p>

					{#if member.website}
						<!-- Le libelle du lien est le domaine, pas « Site personnel » : c est
						     ce que la personne publie sous son nom, et c est ce qu on lit
						     dans la barre d adresse apres avoir clique. -->
						{@const domain = member.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
						<p class="text-muted mt-3 text-sm">
							Site personnel&nbsp;:
							<a
								href={member.website}
								target="_blank"
								rel="noopener noreferrer"
								class="text-coral-ink font-semibold underline decoration-2 underline-offset-2"
							>
								{domain}
							</a>
						</p>
					{/if}
				</li>
			{/each}
		</ul>
	</div>
</section>

<!-- Ce qui porte le projet, sur aplat noir. -->
<section class="bg-ink text-paper" aria-labelledby="structure">
	<div class="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
		<div class="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
			<div>
				<h2 id="structure">Ce qui porte le projet</h2>
				<p class="measure mt-6 text-lg leading-relaxed opacity-85">
					Humanitour est une association à but non lucratif. Elle ne vend pas de question, n'accepte
					pas de commanditaire et ne revend aucune donnée. Son financement vient des adhésions et
					des dons.
				</p>

				<h3 class="mt-10 text-lg font-semibold">{INCUBATOR.label} : {INCUBATOR.name}</h3>
				<p class="measure mt-2 leading-relaxed opacity-80">{INCUBATOR.body}</p>

				<p class="measure mt-8 leading-relaxed opacity-80">
					L'association applique le {POLLING.code}. Les sondages électoraux relèvent du contrôle de
					la
					<a
						class="underline decoration-2 underline-offset-2"
						href={POLLING.commissionUrl}
						target="_blank"
						rel="noopener noreferrer">Commission des sondages</a
					>.
				</p>
			</div>

			<div>
				<h2 class="sr-only">Identité déclarée de l'association</h2>
				<dl class="divide-y divide-white/15">
					{#each IDENTITY as row (row.term)}
						<div class="grid gap-1 py-4 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-6">
							<dt class="font-semibold opacity-80">{row.term}</dt>
							<dd class="leading-snug">{row.value}</dd>
						</div>
					{/each}
				</dl>

				<p class="mt-6 leading-relaxed opacity-80">
					Le code est sous
					<a
						class="underline decoration-2 underline-offset-2"
						href={LICENSES.code.url}
						target="_blank"
						rel="noopener noreferrer">{LICENSES.code.name}</a
					>, les données sous
					<a
						class="underline decoration-2 underline-offset-2"
						href={LICENSES.data.url}
						target="_blank"
						rel="noopener noreferrer">{LICENSES.data.name}</a
					>.
				</p>
			</div>
		</div>
	</div>
</section>

<!-- Cloture : l association se rejoint, elle ne se contemple pas. -->
<section class="surface-brand" aria-labelledby="rejoindre">
	<div class="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
		<h2 id="rejoindre" class="max-w-3xl text-3xl sm:text-5xl">Le collectif s'agrandit</h2>
		<p class="measure mt-7 text-xl font-medium">
			L'institut appartient à ses adhérents. Adhère, ou viens simplement voir comment ça se
			fabrique, sur le Discord.
		</p>
		<div class="mt-10 flex flex-wrap gap-3">
			<Button href={LINKS.helloasso.href} external size="lg">Adhérer à l'association</Button>
			<Button href={LINKS.discord.href} external size="lg" variant="outline">
				Rejoindre le Discord
			</Button>
			<Button href="mailto:{SITE.email}" size="lg" variant="ghost">Nous écrire</Button>
		</div>
	</div>
</section>
{/if}
