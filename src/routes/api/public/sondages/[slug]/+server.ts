import { publicError, publicJson } from '$lib/server/api/public';
import {
	crossableQuestions,
	getPublishedSurvey,
	questionModalities,
	resolveThreshold
} from '$lib/server/survey/queries';
import type { RequestHandler } from './$types';

/**
 * Une enquete et son schema de questions.
 *
 * Le schema est publie entier, modalites comprises : sans lui, personne ne peut
 * construire une requete de croisement, et l API ne serait ouverte que de nom.
 */
export const GET: RequestHandler = async ({ params }) => {
	const survey = await getPublishedSurvey(params.slug);
	if (!survey) return publicError(404, "Cette enquête n'existe pas ou n'est pas publiée.");

	const crossable = new Set(crossableQuestions(survey).map((question) => question.code));

	return publicJson({
		slug: survey.slug,
		titre: survey.title,
		sousTitre: survey.subtitle,
		description: survey.description,
		methodologie: survey.methodology,
		terrainDebut: survey.fieldworkStart,
		terrainFin: survey.fieldworkEnd,
		publieLe: survey.publishedAt,
		reponses: survey.responseCount,
		// Le seuil est publie : une case masquee doit pouvoir s expliquer sans
		// avoir a nous ecrire.
		seuilAnonymat: await resolveThreshold(survey),
		questions: survey.questions.map((question) => ({
			code: question.code,
			libelle: question.label,
			type: question.type,
			croisable: crossable.has(question.code),
			modalites: questionModalities(question).map((modality) => ({
				modalite: modality.key,
				libelle: modality.label,
				nonReponse: modality.isNonResponse
			}))
		})),
		exports: {
			csv: `/donnees/${survey.slug}/export.csv`,
			json: `/donnees/${survey.slug}/export.json`
		}
	});
};
