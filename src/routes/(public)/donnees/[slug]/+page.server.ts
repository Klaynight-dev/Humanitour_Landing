import { error } from '@sveltejs/kit';
import { chartsFor, resolveChart, type ChartShape } from '$charts';
import { crosstab, distribution } from '$lib/server/survey/aggregate';
import {
	crossableQuestions,
	findQuestion,
	getAnswerRows,
	getPublishedSurvey,
	questionModalities,
	resolveThreshold,
	type PublicQuestion
} from '$lib/server/survey/queries';
import type { PageServerLoad } from './$types';

/**
 * Page publique d un sondage, et explorateur de croisements.
 *
 * Les parametres d URL `x`, `y`, `chart` et `nr` forment un PERMALIEN : un
 * croisement partage par un journaliste doit continuer de fonctionner dans
 * quatre ans. On peut en ajouter, jamais en renommer (AGENTS.md section 1.4).
 */

function pickDefaultQuestion(questions: readonly PublicQuestion[]): PublicQuestion | null {
	return questions[0] ?? null;
}

export const load: PageServerLoad = async ({ params, url }) => {
	const survey = await getPublishedSurvey(params.slug);
	if (!survey) error(404, { message: "Cette enquete n'existe pas ou n'est pas publiee." });

	const crossable = crossableQuestions(survey);
	if (crossable.length === 0) {
		error(500, { message: "Cette enquete ne comporte aucune question exploitable." });
	}

	const xQuestion = findQuestion(survey, url.searchParams.get('x')) ?? pickDefaultQuestion(crossable);
	if (!xQuestion) error(404, { message: 'Question introuvable.' });

	// Un `y` qui ne correspond a rien est ignore plutot que fatal : un lien
	// partage doit survivre a la suppression d une question.
	const yQuestion = findQuestion(survey, url.searchParams.get('y'));

	const shape: ChartShape = yQuestion ? 'crosstab' : 'distribution';
	const chart = resolveChart(url.searchParams.get('chart') ?? '', shape);

	// `nr=0` retire la non-reponse de l AFFICHAGE. La base de calcul, elle, ne
	// change pas : retirer les non-reponses ne doit jamais gonfler les parts.
	const includeNonResponses = url.searchParams.get('nr') !== '0';

	const threshold = await resolveThreshold(survey);
	const xAnswers = await getAnswerRows(xQuestion.id);

	const result = yQuestion
		? {
				shape: 'crosstab' as const,
				crosstab: crosstab(
					xAnswers,
					await getAnswerRows(yQuestion.id),
					questionModalities(xQuestion),
					questionModalities(yQuestion),
					{ threshold, includeNonResponses }
				)
			}
		: {
				shape: 'distribution' as const,
				distribution: distribution(xAnswers, questionModalities(xQuestion), {
					threshold,
					includeNonResponses
				})
			};

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
		questions: survey.questions.map((question) => ({
			code: question.code,
			label: question.label,
			isCrossable: crossable.includes(question)
		})),
		selection: {
			x: xQuestion.code,
			xLabel: xQuestion.label,
			y: yQuestion?.code ?? null,
			yLabel: yQuestion?.label ?? null,
			chart: chart.key,
			includeNonResponses
		},
		charts: chartsFor(shape).map(({ key, label, description }) => ({ key, label, description })),
		threshold,
		result
	};
};
