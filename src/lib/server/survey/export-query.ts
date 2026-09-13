import { prisma } from '../db';
import type { ExportableResponse } from './export';

/**
 * Charge les reponses d un sondage pour l export.
 *
 * Ne remonte que la cle de modalite : ni la valeur numerique exacte, ni le
 * verbatim, ne doivent quitter le serveur (voir export.ts).
 */
export async function loadExportableResponses(surveyId: string): Promise<ExportableResponse[]> {
	const responses = await prisma.response.findMany({
		where: { surveyId },
		orderBy: { collectedAt: 'asc' },
		select: {
			id: true,
			collectedAt: true,
			answers: { select: { modalityKey: true, question: { select: { code: true } } } }
		}
	});

	return responses.map((response) => ({
		id: response.id,
		collectedAt: response.collectedAt,
		answers: response.answers.map((answer) => ({
			questionCode: answer.question.code,
			modalityKey: answer.modalityKey
		}))
	}));
}
