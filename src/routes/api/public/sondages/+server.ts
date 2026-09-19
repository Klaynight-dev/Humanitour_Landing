import { publicJson } from '$lib/server/api/public';
import { listPublishedSurveys } from '$lib/server/survey/queries';
import type { RequestHandler } from './$types';

/** Les enquetes publiees. Aucune enquete en brouillon ne sort d ici. */
export const GET: RequestHandler = async () => {
	const surveys = await listPublishedSurveys();

	return publicJson({
		sondages: surveys.map((survey) => ({
			slug: survey.slug,
			titre: survey.title,
			sousTitre: survey.subtitle,
			publieLe: survey.publishedAt,
			terrainDebut: survey.fieldworkStart,
			terrainFin: survey.fieldworkEnd,
			reponses: survey.responseCount,
			questions: survey.questionCount
		}))
	});
};
