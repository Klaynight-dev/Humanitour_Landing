import { error } from '@sveltejs/kit';
import { buildChart, chartsFor, colorSlots, resolveChart } from '$charts';
import { exploreSearch, parseExploreParams } from '$shared/explore';
import { codeExamples, longCitation, shortCitation } from '$shared/citation';
import { getQuestionType } from '$shared/questions';
import { formatFieldwork } from '$shared/format';
import {
	baseOf,
	buildFilterGroups,
	buildOutcome,
	describeDropped,
	resolveSort,
	shapeOf,
	sortOutcome
} from '$lib/server/survey/explore';
import { renderChartSvg } from '$lib/server/charts';
import { insightsOf } from '$lib/server/survey/insights';
import {
	filterableQuestions,
	getPublishedSurvey,
	prepareExplore
} from '$lib/server/survey/queries';
import type { PageServerLoad } from './$types';

/**
 * Page publique d un sondage, et explorateur de croisements.
 *
 * Les parametres `x`, `y`, `chart`, `nr`, `tri` et `filtre` forment un
 * PERMALIEN : un croisement partage par un journaliste doit continuer de
 * fonctionner dans quatre ans. Leur lecture vit dans `$shared/explore`, la meme
 * que celle de l API publique, et on peut en ajouter mais jamais en renommer
 * (AGENTS.md section 1.4).
 *
 * Le calcul vit dans `prepareExplore` et `buildOutcome`, partages avec
 * `/api/public/sondages/[slug]/resultat`. La page et l API ne peuvent donc pas
 * publier deux chiffres differents pour la meme question.
 */
export const load: PageServerLoad = async ({ params, url }) => {
	const survey = await getPublishedSurvey(params.slug);
	if (!survey) error(404, { message: "Cette enquete n'existe pas ou n'est pas publiee." });

	const requested = parseExploreParams(url.searchParams);
	const prepared = await prepareExplore(survey, requested);
	if (!prepared) error(500, { message: 'Cette enquete ne comporte aucune question exploitable.' });

	const shape = shapeOf({ y: prepared.y });
	const chart = resolveChart(requested.chart, shape);

	// Le tri depend du TYPE de la question portee en abscisse : une echelle
	// garde son ordre, une liste de choix se classe par effectif.
	const sort = resolveSort(
		requested.sort,
		getQuestionType(prepared.xQuestion.type)?.ordered ?? false
	);

	const outcome = sortOutcome(
		buildOutcome({
			x: prepared.x,
			y: prepared.y,
			population: prepared.population,
			threshold: prepared.threshold,
			includeNonResponses: requested.includeNonResponses
		}),
		sort
	);

	// Les memes questions servent les deux axes et le panneau de filtres : une
	// variable socio-demographique n est pas une categorie a part, c est une
	// question comme les autres (CLAUDE.md, modele de donnees).
	const filterable = filterableQuestions(survey);
	const base = baseOf(outcome);

	/*
	 * Le graphique est rendu ICI, en SVG.
	 *
	 * Les couleurs sont figees sur l ordre DECLARE des modalites, et non sur
	 * leur position a l ecran : trier par effectif ou masquer la non-reponse ne
	 * doit pas repeindre le graphique, sinon deux captures de la meme enquete ne
	 * se comparent plus (`charts/palette.ts`). Les series portent les modalites
	 * croisees quand il y en a, celles de la question sinon.
	 */
	const painted = prepared.y ?? prepared.x;
	const chartContext = {
		question: prepared.x.label,
		crossedWith: prepared.y?.label,
		colorSlots: colorSlots(painted.modalities)
	};

	const built =
		outcome.kind === 'too-small'
			? null
			: buildChart(
					chart,
					outcome.kind === 'crosstab' ? outcome.crosstab : outcome.distribution,
					chartContext
				);

	const share = buildShare({ survey, requested, prepared, filterable, base, origin: url.origin });

	return {
		survey: {
			slug: survey.slug,
			title: survey.title,
			subtitle: survey.subtitle,
			description: survey.description,
			methodology: survey.methodology,
			fieldworkStart: survey.fieldworkStart,
			fieldworkEnd: survey.fieldworkEnd,
			responseCount: survey.responseCount
		},
		questions: filterable.map(({ code, label }) => ({ code, label })),
		filterGroups: buildFilterGroups(filterable, requested.filters),
		selection: {
			x: prepared.x.code,
			xLabel: prepared.x.label,
			y: prepared.y?.code ?? null,
			yLabel: prepared.y?.label ?? null,
			chart: chart.key,
			includeNonResponses: requested.includeNonResponses,
			filters: requested.filters,
			sort: requested.sort
		},
		charts: chartsFor(shape).map(({ key, label, description }) => ({ key, label, description })),
		chart: built
			? { key: chart.key, option: built.option, height: built.height, svg: renderChartSvg(built) }
			: null,
		chartIsTabular: chart.tabular,
		threshold: prepared.threshold,
		population: {
			// Sous le seuil, l effectif de la sous-population est lui-meme un
			// agregat identifiant : il ne descend pas jusqu a la page.
			size: outcome.kind === 'too-small' ? null : prepared.population.size,
			total: prepared.population.total,
			restricted: prepared.population.restricted
		},
		outcome,
		insights: insightsOf(outcome),
		appliedSort: sort,
		droppedMessage: describeDropped(prepared.dropped),
		share
	};
};

/**
 * De quoi citer, telecharger et rejouer le resultat affiche.
 *
 * Extrait du chargement parce que celui-ci faisait deux choses : calculer un
 * resultat, et fabriquer les adresses qui l accompagnent. Les adresses sont
 * absolues et deduites de la REQUETE plutot que d une variable
 * d environnement : une citation ne doit pas pouvoir pointer ailleurs que la
 * ou se trouve le lecteur qui la copie.
 */
function buildShare(input: {
	survey: { slug: string; title: string; fieldworkStart: Date | null; fieldworkEnd: Date | null };
	requested: ReturnType<typeof parseExploreParams>;
	prepared: { x: { label: string }; y: { label: string } | null };
	filterable: ReturnType<typeof filterableQuestions>;
	base: number | null;
	origin: string;
}) {
	const { survey, requested, prepared, filterable, base, origin } = input;
	const search = exploreSearch(requested);
	const query = search ? `?${search}` : '';

	const pageUrl = `${origin}/donnees/${survey.slug}${query}`;
	const apiUrl = `${origin}/api/public/sondages/${survey.slug}/resultat${query}`;

	const context = {
		surveyTitle: survey.title,
		questionLabel: prepared.x.label,
		crossedWithLabel: prepared.y?.label ?? null,
		base,
		filters: describeFilters(filterable, requested.filters),
		fieldwork: formatFieldwork(survey.fieldworkStart, survey.fieldworkEnd),
		pageUrl,
		apiUrl,
		consultedOn: new Date()
	};

	return {
		pageUrl,
		apiUrl,
		csvUrl: `/donnees/${survey.slug}/croisement.csv${query}`,
		shortCitation: shortCitation(context),
		longCitation: longCitation(context),
		codeExamples: codeExamples(apiUrl)
	};
}

/**
 * Les filtres actifs, en libelles lisibles.
 *
 * La citation doit dire sur QUI porte le chiffre. « region:bre » ne le dit pas,
 * « Votre region : Bretagne » le dit.
 */
function describeFilters(
	questions: ReturnType<typeof filterableQuestions>,
	filters: ReturnType<typeof parseExploreParams>['filters']
): readonly string[] {
	return filters.flatMap((clause) => {
		const question = questions.find((candidate) => candidate.code === clause.questionCode);
		if (!question) return [];

		const labels = clause.modalityKeys.map(
			(key) => question.modalities.find((modality) => modality.key === key)?.label ?? key
		);

		return [`${question.label} : ${labels.join(' ou ')}`];
	});
}
