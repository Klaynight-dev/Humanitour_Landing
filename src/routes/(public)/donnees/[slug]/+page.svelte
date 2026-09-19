<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { navigating, page } from '$app/state';
	import { colorFor, getChart } from '$charts';
	import EChart from '$components/explorer/EChart.svelte';
	import ResultHeadline from '$components/explorer/ResultHeadline.svelte';
	import ResultTable from '$components/explorer/ResultTable.svelte';
	import ShareBar from '$components/explorer/ShareBar.svelte';
	import { formatBase, formatCount, formatFieldwork } from '$shared/format';
	import { composePoster, type PosterChart } from '$lib/poster';
	import {
		exploreSearch,
		filterValue,
		PARAM_FILTER,
		parseFilterValues,
		parseSort,
		type ExploreParams,
		type SortMode
	} from '$shared/explore';
	import { LICENSES } from '$shared/site';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const chart = $derived(getChart(data.selection.chart));

	/**
	 * Etat courant de l explorateur, sous la forme qui sert a ecrire les liens.
	 *
	 * Un seul objet decrit la page, et c est le meme que celui que lit le
	 * serveur : il n y a donc pas deux representations de « ce qui est affiche »
	 * a tenir synchronisees.
	 */
	const current = $derived<ExploreParams>({
		x: data.selection.x,
		y: data.selection.y,
		z: data.selection.z,
		chart: data.selection.chart,
		includeNonResponses: data.selection.includeNonResponses,
		filters: data.selection.filters,
		sort: data.selection.sort
	});

	/** Adresse de l explorateur ou un seul aspect change. Les autres survivent. */
	function exploreUrl(changes: Partial<ExploreParams>): string {
		return `?${exploreSearch({ ...current, ...changes })}`;
	}

	/**
	 * Amelioration progressive.
	 *
	 * Sans JavaScript, le formulaire GET s envoie et la page se recharge : chaque
	 * etat a son adresse, et c est ce qui rend un croisement citable. Avec
	 * JavaScript, on intercepte et on remplace juste les donnees, sans recharger.
	 * Le bouton d envoi ne s affiche donc que tant que l interception n est pas
	 * en place : une commande qui ne sert plus a rien est une commande morte.
	 */
	let enhanced = $state(false);
	let form: HTMLFormElement | null = $state(null);

	onMount(() => {
		enhanced = true;
	});

	/**
	 * Une mise a jour de CE resultat est en cours.
	 *
	 * On compare les chemins : un telechargement ou un depart vers une autre
	 * page declenchent aussi une navigation, et grisaient alors le graphique
	 * sans jamais le degriser, puisque la page ne change pas.
	 */
	const busy = $derived(navigating.to !== null && navigating.to.url.pathname === page.url.pathname);

	function textOf(value: FormDataEntryValue | null): string | null {
		const text = typeof value === 'string' ? value.trim() : '';
		return text === '' ? null : text;
	}

	/** Lit l etat du formulaire tel que le navigateur l enverrait. */
	function readForm(target: HTMLFormElement): ExploreParams {
		const fields = new FormData(target);

		return {
			x: textOf(fields.get('x')),
			y: textOf(fields.get('y')),
			z: textOf(fields.get('z')),
			chart: textOf(fields.get('chart')) ?? '',
			// La case cochee ajoute « 1 » devant le « 0 » du champ cache : c est
			// ainsi que le serveur distingue « decochee » de « absente ».
			includeNonResponses: fields.getAll('nr').includes('1'),
			filters: parseFilterValues(fields.getAll(PARAM_FILTER).map(String)),
			sort: parseSort(textOf(fields.get('tri')))
		};
	}

	function apply(target: HTMLFormElement, replaceState: boolean): void {
		// `keepFocus` : sans lui, cocher une case renvoie le focus au document et
		// la navigation au clavier repart du haut de la page a chaque clic.
		goto(`?${exploreSearch(readForm(target))}`, {
			replaceState,
			keepFocus: true,
			noScroll: true
		});
	}

	function onChange(event: Event): void {
		if (!enhanced || !form) return;

		// Cocher un filtre affine la meme exploration : on remplace l entree
		// d historique. Changer de question en ouvre une autre : on en empile
		// une, pour que « precedent » revienne au croisement d avant et non vingt
		// crans en arriere.
		const field = event.target as HTMLInputElement | HTMLSelectElement | null;
		apply(form, field?.name === PARAM_FILTER);
	}

	function onSubmit(event: SubmitEvent): void {
		if (!enhanced) return;
		event.preventDefault();
		apply(event.currentTarget as HTMLFormElement, false);
	}

	/**
	 * Ouverture des groupes de filtres, une fois que l utilisateur s en est saisi.
	 *
	 * Sans cet etat local, l ouverture se recalculait depuis les donnees du
	 * serveur a chaque changement : un groupe ouvert a la main se refermait au
	 * clic suivant, et il fallait le rouvrir entre chaque case cochee.
	 */
	const openGroups = $state<Record<string, boolean>>({});

	function isOpen(questionCode: string, selectedCount: number): boolean {
		return openGroups[questionCode] ?? selectedCount > 0;
	}

	function rememberToggle(questionCode: string, event: Event): void {
		openGroups[questionCode] = (event.currentTarget as HTMLDetailsElement).open;
	}

	const suppressed = $derived(
		data.outcome.kind === 'distribution'
			? data.outcome.distribution.suppressedCount
			: data.outcome.kind === 'crosstab'
				? data.outcome.crosstab.suppressedCount
				: 0
	);

	const activeFilters = $derived(
		data.selection.filters.reduce((total, clause) => total + clause.modalityKeys.length, 0)
	);

	const SORTS: readonly { mode: SortMode; label: string }[] = [
		{ mode: 'effectif', label: 'Par effectif' },
		{ mode: 'questionnaire', label: 'Ordre du questionnaire' }
	];

	/**
	 * Description du graphique pour qui ne le voit pas.
	 *
	 * Le dessin porte `role="img"` : sans libelle, un lecteur d ecran annoncerait
	 * « image » et rien d autre. Le tableau de chiffres reste la lecture
	 * complete, celle-ci n est que l etiquette.
	 */
	const chartLabel = $derived(
		data.selection.yLabel
			? `${chart?.label ?? 'Graphique'} : ${data.selection.xLabel}, croisé avec ${data.selection.yLabel}`
			: `${chart?.label ?? 'Graphique'} : ${data.selection.xLabel}`
	);

	/**
	 * L affiche PNG : le graphique habille de la charte, et surtout de ce qui
	 * permet de le verifier.
	 *
	 * Le composant de graphique expose son rendu ; la composition, elle, vit
	 * dans `$lib/poster.ts`, ou sa mise en page se teste sans navigateur.
	 */
	let chartView: { toPng: () => Promise<PosterChart | null> } | null = $state(null);

	async function downloadPoster(): Promise<void> {
		const rendered = await chartView?.toPng();
		if (!rendered) return;

		const blob = await composePoster(
			{
				surveyTitle: data.survey.title,
				question: data.selection.xLabel,
				crossedWith: data.selection.yLabel,
				base: data.population.size === null ? '' : formatBase(data.population.size),
				fieldwork: formatFieldwork(data.survey.fieldworkStart, data.survey.fieldworkEnd),
				licence: LICENSES.data.name,
				url: data.share.pageUrl,
				chart: rendered
			},
			'/logo-lockup-ink.png'
		);

		const href = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = href;
		link.download = `humanitour-${data.survey.slug}-${data.selection.x}.png`;
		link.click();
		// Sans liberation, le blob reste en memoire jusqu au rechargement de la
		// page, et une exploration en enchaine des dizaines.
		URL.revokeObjectURL(href);
	}

	/** Titre du document : il porte le croisement, donc le permalien s annonce. */
	const documentTitle = $derived(
		data.selection.yLabel
			? `${data.selection.xLabel} croisé avec ${data.selection.yLabel}, ${data.survey.title}`
			: `${data.selection.xLabel}, ${data.survey.title}`
	);
</script>

<svelte:head>
	<title>{documentTitle} | Humanitour</title>
	<meta name="description" content={data.survey.subtitle ?? data.survey.title} />
</svelte:head>

<!--
	Bandeau d ouverture sur le degrade de marque, texte NOIR.
	C est le moment colore de la page : l enquete se presente. Le degrade ne
	passe jamais derriere un graphique (`app.css`, `--gradient-mesh`).
-->
<header class="surface-mesh relative isolate overflow-hidden">
	<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
		<nav class="mb-6 text-sm" aria-label="Fil d'Ariane">
			<a href="/donnees" class="underline decoration-2 underline-offset-2">Les données</a>
			<span aria-hidden="true"> / </span>
			<span class="font-semibold">{data.survey.title}</span>
		</nav>

		<h1 class="max-w-3xl text-4xl sm:text-5xl">{data.survey.title}</h1>
		{#if data.survey.subtitle}
			<p class="measure mt-4 text-lg leading-relaxed">{data.survey.subtitle}</p>
		{/if}

		<!--
			Les trois reperes de l enquete, sur fond blanc : du texte pose
			directement sur le degrade ne tient le contraste qu en gros corps.
		-->
		<dl class="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
			<div class="bg-paper rounded-panel px-4 py-3">
				<dt class="text-muted text-xs tracking-wide uppercase">Réponses</dt>
				<dd class="tabular mt-1 text-2xl font-bold">{formatCount(data.survey.responseCount)}</dd>
			</div>
			<div class="bg-paper rounded-panel px-4 py-3">
				<dt class="text-muted text-xs tracking-wide uppercase">Questions</dt>
				<dd class="tabular mt-1 text-2xl font-bold">{formatCount(data.questions.length)}</dd>
			</div>
			<div class="bg-paper rounded-panel px-4 py-3">
				<dt class="text-muted text-xs tracking-wide uppercase">Seuil d'anonymat</dt>
				<dd class="tabular mt-1 text-2xl font-bold">k = {data.threshold}</dd>
			</div>
		</dl>

		<p class="mt-6 text-sm">
			{formatFieldwork(data.survey.fieldworkStart, data.survey.fieldworkEnd)}.
		</p>

		{#if data.survey.description}
			<p class="measure mt-6 leading-relaxed">{data.survey.description}</p>
		{/if}
	</div>
</header>

<div class="bg-paper">
	<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
		<section aria-labelledby="explorateur">
			<h2 id="explorateur">Explorer</h2>
			<p class="measure text-ink-soft mt-3 leading-relaxed">
				Choisissez une question, ajoutez-en une seconde pour la croiser, restreignez la population
				autant que vous voulez, puis partagez l'adresse de la page : elle restera valable.
			</p>

			<div class="mt-8 grid items-start gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
				<!--
					Panneau de commande. Il reste sous les yeux pendant qu on fait
					defiler le resultat : on doit pouvoir lire un chiffre sans perdre de
					vue la population sur laquelle il porte.
				-->
				<form
					method="GET"
					bind:this={form}
					onchange={onChange}
					onsubmit={onSubmit}
					class="panel lg:sticky lg:top-[5.25rem] lg:max-h-[calc(100svh-6.5rem)] lg:overflow-y-auto"
					aria-label="Réglages de l'explorateur"
				>
					<div class="flex flex-col gap-5 p-5">
						<label class="flex min-w-0 flex-col gap-2">
							<span class="font-semibold">Question</span>
							<select
								name="x"
								class="border-ink/20 rounded-field bg-paper min-h-11 w-full min-w-0 border px-3 py-2.5"
								value={data.selection.x}
							>
								{#each data.questions as question (question.code)}
									<option value={question.code}>{question.label}</option>
								{/each}
							</select>
						</label>

						<label class="flex min-w-0 flex-col gap-2">
							<span class="font-semibold">Croiser avec</span>
							<select
								name="y"
								class="border-ink/20 rounded-field bg-paper min-h-11 w-full min-w-0 border px-3 py-2.5"
								value={data.selection.y ?? ''}
							>
								<option value="">Aucun croisement</option>
								{#each data.questions.filter((q) => q.code !== data.selection.x) as question (question.code)}
									<option value={question.code}>{question.label}</option>
								{/each}
							</select>
						</label>

						<label class="flex min-w-0 flex-col gap-2">
							<span class="font-semibold">Découper par</span>
							<select
								name="z"
								class="border-ink/20 rounded-field bg-paper min-h-11 w-full min-w-0 border px-3 py-2.5"
								value={data.selection.z ?? ''}
							>
								<option value="">Aucun découpage</option>
								{#each data.questions.filter((q) => q.code !== data.selection.x && q.code !== data.selection.y) as question (question.code)}
									<option value={question.code}>{question.label}</option>
								{/each}
							</select>
							<span class="text-muted text-xs leading-relaxed">
								Le résultat est répété une fois par modalité. Trois variables divisent l'échantillon
								: les effectifs deviennent vite trop faibles pour être publiés.
							</span>
						</label>

						<!-- Le graphique et le tri voyagent avec le formulaire : sans ces
						     champs, un envoi ramenerait l affichage par defaut. -->
						<input type="hidden" name="chart" value={data.selection.chart} />
						<input type="hidden" name="tri" value={data.selection.sort ?? ''} />

						<label class="flex min-h-11 items-center gap-3">
							<input
								type="checkbox"
								name="nr"
								value="1"
								checked={data.selection.includeNonResponses}
								class="accent-coral h-5 w-5 shrink-0"
							/>
							<span>Afficher les non-réponses</span>
						</label>
						<!--
							Le serveur ne retire la non-reponse que sur la valeur « 0 ». Une
							case decochee n envoie rien du tout : sans ce champ, la decocher
							restait sans effet. Il est place APRES la case pour que, cochee,
							« 1 » arrive en premier et l emporte.
						-->
						<input type="hidden" name="nr" value="0" />
					</div>

					<div class="border-ink/12 border-t p-5">
						<div class="flex items-baseline justify-between gap-3">
							<h3 class="text-base font-semibold">Restreindre la population</h3>
							{#if activeFilters > 0}
								<a
									href={exploreUrl({ filters: [] })}
									data-sveltekit-noscroll
									data-sveltekit-keepfocus
									class="text-coral-ink shrink-0 text-sm font-semibold underline decoration-2 underline-offset-2"
								>
									Tout retirer
								</a>
							{/if}
						</div>
						<p class="text-muted mt-2 text-sm leading-relaxed">
							Plusieurs choix dans une même question élargissent, deux questions filtrées
							restreignent.
						</p>

						<div class="mt-4 flex flex-col gap-1">
							{#each data.filterGroups as group, index (group.questionCode)}
								<details
									class="border-ink/12 rounded-field border"
									open={isOpen(group.questionCode, group.selectedCount)}
									ontoggle={(event) => rememberToggle(group.questionCode, event)}
								>
									<summary
										class="flex min-h-11 cursor-pointer items-center gap-2 px-3 py-2.5 text-sm font-medium"
									>
										<!--
											La pastille donne a chaque question une identite visuelle
											stable dans le panneau. Elle ne porte aucune information
											a elle seule : le libelle est juste a cote.
										-->
										<span
											class="h-2.5 w-2.5 shrink-0 rounded-full"
											style:background-color={colorFor(index)}
											aria-hidden="true"
										></span>
										<span class="min-w-0 flex-1 truncate">{group.questionLabel}</span>
										{#if group.selectedCount > 0}
											<!-- L etat est ecrit, pas seulement colore : un filtre actif
											     doit se lire sans distinguer les teintes. -->
											<span
												class="bg-ink text-paper tabular shrink-0 rounded-full px-2 py-0.5 text-xs"
											>
												{group.selectedCount}
											</span>
										{/if}
									</summary>
									<ul class="max-h-64 overflow-y-auto px-3 pb-3">
										{#each group.options as option (option.key)}
											<li>
												<label class="flex min-h-11 items-center gap-3 py-1">
													<input
														type="checkbox"
														name={PARAM_FILTER}
														value={filterValue(group.questionCode, option.key)}
														checked={option.selected}
														class="accent-coral h-5 w-5 shrink-0"
													/>
													<span class="text-sm {option.isNonResponse ? 'text-muted italic' : ''}">
														{option.label}
													</span>
												</label>
											</li>
										{/each}
									</ul>
								</details>
							{/each}
						</div>
					</div>

					<!--
						L effectif retenu, toujours visible. Un pourcentage sans sa base ne
						veut rien dire, et un filtre qui vide l echantillon doit se voir
						avant qu on lise le graphique.
					-->
					<div class="border-ink/12 bg-cream border-t p-5">
						<p class="text-sm">
							{#if data.population.size === null}
								<span class="font-semibold">Moins de {data.threshold} répondants retenus</span>
							{:else}
								<span class="tabular text-lg font-semibold">
									{formatCount(data.population.size)}
								</span>
								<span class="text-muted">
									répondant{data.population.size > 1 ? 's' : ''} retenu{data.population.size > 1
										? 's'
										: ''} sur {formatCount(data.population.total)}
								</span>
							{/if}
						</p>

						{#if !enhanced}
							<button
								type="submit"
								class="bg-ink text-paper press rounded-pill mt-4 min-h-11 w-full px-6 py-2.5 font-semibold"
							>
								Afficher le résultat
							</button>
						{/if}
					</div>
				</form>

				<!-- Le resultat, comme un objet complet : constat, graphique, tableau,
				     base, et de quoi le citer. -->
				<div class="min-w-0">
					{#if data.droppedMessage}
						<p
							class="border-coral-ink bg-coral-wash rounded-field mb-4 border-l-4 px-4 py-3 text-sm leading-relaxed"
							role="status"
						>
							{data.droppedMessage}
						</p>
					{/if}

					<!--
						Aucun filet decoratif en tete : un trait colore qui ne porte pas
						d information est de la decoration, et la signature de la marque a
						sa place sur l affiche exportee, pas sur la carte de lecture.
					-->
					<figure class="border-ink/12 rounded-block border">
						<div class="p-5 sm:p-8" aria-busy={busy} style:opacity={busy ? 0.55 : 1}>
							{#if data.population.total === 0}
								<!-- Etat vide : il dit pourquoi c est vide, pas seulement que ca l est. -->
								<h3 class="text-xl">Aucune réponse n'est encore enregistrée</h3>
								<p class="measure text-ink-soft mt-3 leading-relaxed">
									L'enquête est publiée mais la saisie des réponses n'a pas commencé. Les résultats
									apparaîtront ici dès la première réponse versée.
								</p>
							{:else if data.outcome.kind === 'too-small'}
								<!--
									Ce n est pas une erreur : c est le seuil d anonymat applique a la
									POPULATION et non aux seules cases. Publier l effectif d une
									combinaison aussi fine reviendrait a designer quelqu un.
								-->
								<h3 class="text-xl">Trop peu de répondants pour publier ce résultat</h3>
								<p class="measure text-ink-soft mt-3 leading-relaxed">
									La combinaison de filtres demandée porte sur moins de {data.threshold} répondants. Publier
									un chiffre ici permettrait d'identifier une personne : nous ne le faisons pas, même
									masqué case par case, parce qu'un total se retrouve par soustraction.
								</p>
								{#if activeFilters > 0}
									<a
										href={exploreUrl({ filters: [] })}
										data-sveltekit-noscroll
										class="border-ink press rounded-pill mt-5 inline-flex min-h-11 items-center border-2 px-6 py-2.5 font-semibold"
									>
										Retirer les filtres
									</a>
								{/if}
							{:else}
								<ResultHeadline insights={data.insights} />

								<div class="mt-6">
									<!--
										Le libelle EXACT de la question, avec le graphique. La
										formulation fait partie du resultat (AGENTS.md section 0).
										Un `figcaption` conviendrait mieux, mais il doit etre fils
										DIRECT de `figure` : le titre porte deja ce role ici.
									-->
									<h3 class="text-xl leading-snug">{data.selection.xLabel}</h3>
									<p class="text-muted mt-2 text-sm">
										{#if data.selection.yLabel}
											Croisé avec « {data.selection.yLabel} ».
										{/if}
										{#if data.selection.zLabel}
											Découpé par « {data.selection.zLabel} ».
										{/if}
										{formatFieldwork(data.survey.fieldworkStart, data.survey.fieldworkEnd)}.
										Effectifs bruts, sans pondération ni redressement.
									</p>
								</div>

								<div class="mt-5 flex flex-wrap items-center gap-2">
									<h4 class="sr-only">Affichage</h4>
									{#each data.charts as option (option.key)}
										{@const active = option.key === data.selection.chart}
										<!--
											`noscroll` et `keepfocus` : changer de graphique n est pas
											changer de page. Sans eux, chaque clic renvoyait en haut du
											document et le lecteur perdait le resultat qu il lisait.
										-->
										<a
											href={exploreUrl({ chart: option.key })}
											data-sveltekit-noscroll
											data-sveltekit-keepfocus
											aria-current={active ? 'true' : undefined}
											title={option.description}
											class="rounded-pill inline-flex min-h-11 items-center px-5 py-2.5 text-sm font-semibold {active
												? 'bg-ink text-paper'
												: 'bg-cream'}"
										>
											{option.label}
										</a>
									{/each}

									<span class="border-ink/12 mx-1 hidden h-6 border-l sm:inline-block"></span>

									{#each SORTS as option (option.mode)}
										{@const active = data.appliedSort === option.mode}
										<a
											href={exploreUrl({ sort: option.mode })}
											data-sveltekit-noscroll
											data-sveltekit-keepfocus
											aria-current={active ? 'true' : undefined}
											class="rounded-pill inline-flex min-h-11 items-center px-4 py-2.5 text-sm {active
												? 'border-ink border-2 font-semibold'
												: 'text-muted hover:text-ink border-ink/20 border'}"
										>
											{option.label}
										</a>
									{/each}
								</div>

								<div class="mt-6">
									{#if busy}
										<p class="text-muted mb-4 text-sm">
											Calcul en cours sur la population retenue…
										</p>
									{/if}

									{#if data.panels}
										<!--
											Petits multiples : chaque panneau se lit comme un resultat
											complet, avec sa propre base. La comparaison se fait d un
											panneau a l autre, jamais en superposant trois variables
											dans un seul dessin.
										-->
										<div class="flex flex-col gap-8">
											{#each data.panels as panel (panel.key)}
												<section class="border-ink/12 rounded-field border p-4">
													<h4 class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
														<span
															class="text-base font-semibold {panel.isNonResponse
																? 'text-muted italic'
																: ''}"
														>
															{data.selection.zLabel} : {panel.label}
														</span>
														<span class="text-muted text-sm font-normal">
															{#if panel.size === null}
																moins de {data.threshold} répondants
															{:else}
																{formatBase(panel.size)}
															{/if}
														</span>
													</h4>

													<div class="mt-3">
														{#if panel.outcome.kind === 'too-small'}
															<p class="text-muted measure text-sm leading-relaxed">
																Trop peu de répondants pour publier ce panneau : le chiffre
																permettrait d'identifier une personne.
															</p>
														{:else if panel.chart}
															<EChart
																svg={panel.chart.svg}
																option={panel.chart.option}
																height={panel.chart.height}
																label="{chartLabel}, {panel.label}"
															/>
														{:else if chart?.render.kind === 'component' && panel.outcome.kind === 'crosstab'}
															{@const Table = chart.render.component}
															<Table
																data={panel.outcome.crosstab}
																xLabel={data.selection.xLabel}
																yLabel={data.selection.yLabel}
															/>
														{/if}
													</div>
												</section>
											{/each}
										</div>
									{:else if data.chart}
										<EChart
											bind:this={chartView}
											svg={data.chart.svg}
											option={data.chart.option}
											height={data.chart.height}
											label={chartLabel}
										/>
									{:else if chart?.render.kind === 'component' && data.outcome.kind === 'crosstab'}
										{@const Table = chart.render.component}
										<Table
											data={data.outcome.crosstab}
											xLabel={data.selection.xLabel}
											yLabel={data.selection.yLabel}
										/>
									{/if}
								</div>

								{#if data.outcome.kind === 'distribution' && !data.chartIsTabular && !data.panels}
									<!-- La couleur ne porte jamais seule l information : trois teintes
									     de la palette passent sous 3:1 contre le papier, et le tableau
									     est la compensation retenue (`charts/palette.ts`). -->
									<details class="border-ink/12 rounded-field mt-6 border">
										<summary
											class="flex min-h-11 cursor-pointer items-center px-4 py-2.5 text-sm font-semibold"
										>
											Voir les chiffres en tableau
										</summary>
										<div class="overflow-x-auto px-4 pt-1 pb-4">
											<ResultTable
												data={data.outcome.distribution}
												question={data.selection.xLabel}
											/>
										</div>
									</details>
								{/if}

								{#if data.population.restricted || suppressed > 0}
									<div
										class="border-ink/12 text-muted mt-6 flex flex-col gap-2 border-t pt-5 text-sm"
									>
										{#if data.population.restricted}
											<p>
												Population restreinte par {activeFilters} filtre{activeFilters > 1
													? 's'
													: ''}. Les parts se lisent sur cette sous-population, pas sur l'enquête
												entière.
											</p>
										{/if}
										{#if suppressed > 0}
											<p>
												{suppressed}
												{suppressed > 1 ? 'cases sont masquées' : 'case est masquée'} : elles portent
												sur moins de {data.threshold} répondants. Les publier permettrait d'identifier
												une personne.
											</p>
										{/if}
									</div>
								{/if}

								<ShareBar
									downloadImage={data.chart && !data.panels ? downloadPoster : null}
									shortCitation={data.share.shortCitation}
									longCitation={data.share.longCitation}
									codeExamples={data.share.codeExamples}
									csvUrl={data.share.csvUrl}
									apiUrl={data.share.apiUrl}
									pageUrl={data.share.pageUrl}
								/>
							{/if}
						</div>
					</figure>
				</div>
			</div>
		</section>

		{#if data.survey.methodology}
			<section class="bg-cream rounded-block mt-16 p-8 sm:p-12" aria-labelledby="methodologie">
				<h2 id="methodologie">Méthodologie de cette enquête</h2>
				<p class="measure text-ink-soft mt-5 leading-relaxed whitespace-pre-line">
					{data.survey.methodology}
				</p>
			</section>
		{/if}

		<!-- Les donnees brutes, sur l aplat noir. C est le coeur de la promesse, et
		     la seule section de la page qui inverse le contraste : elle doit se
		     remarquer meme pour qui fait defiler sans lire. -->
		<section class="bg-ink text-paper rounded-block mt-8 p-8 sm:p-12" aria-labelledby="brut">
			<h2 id="brut">Les données brutes</h2>
			<p class="measure mt-5 leading-relaxed">
				Le jeu complet, réponse par réponse, sans compte ni inscription. C'est ce que les instituts
				privés ne publient pas.
			</p>
			<div class="mt-8 flex flex-wrap gap-3">
				<a
					href="/donnees/{data.survey.slug}/export.csv"
					data-sveltekit-reload
					download
					class="bg-paper text-ink press rounded-pill inline-flex min-h-11 items-center px-6 py-2.5 font-semibold"
				>
					Télécharger en CSV
				</a>
				<a
					href="/donnees/{data.survey.slug}/export.json"
					data-sveltekit-reload
					download
					class="border-paper press rounded-pill inline-flex min-h-11 items-center border-2 px-6 py-2.5 font-semibold"
				>
					Télécharger en JSON
				</a>
				<a
					href="/api/public/sondages/{data.survey.slug}"
					data-sveltekit-reload
					class="press rounded-pill inline-flex min-h-11 items-center px-6 py-2.5 font-semibold underline decoration-2 underline-offset-4"
				>
					Le schéma en JSON
				</a>
			</div>
			<p class="measure mt-6 text-sm">
				Sous licence
				<a
					class="underline decoration-2 underline-offset-2"
					href={LICENSES.data.url}
					target="_blank"
					rel="noopener noreferrer">{LICENSES.data.name}</a
				>. Citez Humanitour et rouvrez vos dérivés.
			</p>
		</section>
	</div>
</div>
