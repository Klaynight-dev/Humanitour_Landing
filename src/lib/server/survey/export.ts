import { getQuestionType, NON_RESPONSE_KEY } from '$lib/shared/questions';
import type { PublicQuestion } from './queries';

/**
 * Export des donnees brutes.
 *
 * C est la promesse centrale du projet : le jeu complet, reponse par reponse,
 * telechargeable sans compte. Deux precautions, qui ne l affaiblissent pas :
 *
 *   1. On exporte la MODALITE, pas la valeur exacte. Une tranche « 28-37 » et non
 *      « 34 ans ». Le seuil de k-anonymat protege les agregats, il ne protege
 *      rien dans un fichier ligne a ligne : region + age exact + profession +
 *      intention de vote identifie quelqu un dans une petite commune.
 *   2. Les verbatims ne sont pas exportes. « Je suis le boulanger du village »
 *      est une donnee identifiante, quelle que soit la colonne ou elle se trouve.
 *
 * Ce qui reste est ce dont un journaliste ou un chercheur a besoin pour refaire
 * nos calculs : c est le but.
 */

export interface ExportableResponse {
	readonly id: string;
	readonly collectedAt: Date;
	readonly answers: readonly { readonly questionCode: string; readonly modalityKey: string }[];
}

/** Questions retenues a l export : tout sauf ce qui ne peut pas etre anonymise. */
export function exportableQuestions(
	questions: readonly PublicQuestion[]
): readonly PublicQuestion[] {
	return questions.filter((question) => getQuestionType(question.type)?.crossable ?? false);
}

/** Libelle d une modalite, pour un fichier lisible sans documentation annexe. */
function modalityLabel(question: PublicQuestion, key: string): string {
	if (key === NON_RESPONSE_KEY) return 'Sans réponse';

	const declared = question.options.find((option) => option.code === key);
	if (declared) return declared.label;

	// Une tranche numerique ou un pas d echelle : la cle est deja lisible.
	return key;
}

/**
 * Valeurs d une reponse, question par question.
 *
 * Une question a choix multiple rend plusieurs modalites : elles sont jointes par
 * un point-virgule, le meme separateur que celui accepte a l import. Le fichier
 * exporte peut donc etre reimporte tel quel.
 */
function cellsFor(
	response: ExportableResponse,
	questions: readonly PublicQuestion[]
): readonly string[] {
	return questions.map((question) => {
		const values = response.answers
			.filter((answer) => answer.questionCode === question.code)
			.map((answer) => modalityLabel(question, answer.modalityKey));

		// Aucune ligne pour cette question : le repondant ne l a pas vue passer.
		if (values.length === 0) return 'Sans réponse';

		return values.join(';');
	});
}

/** Echappement CSV : guillemets doubles des que la valeur contient un separateur. */
export function escapeCsv(value: string): string {
	if (!/[",;\r\n]/.test(value)) return value;
	return `"${value.replace(/"/g, '""')}"`;
}

export function toCsv(
	responses: readonly ExportableResponse[],
	questions: readonly PublicQuestion[]
): string {
	const columns = ['reponse_id', 'date_collecte', ...questions.map((question) => question.code)];
	const lines = [columns.map(escapeCsv).join(',')];

	for (const response of responses) {
		const cells = [
			response.id,
			response.collectedAt.toISOString().slice(0, 10),
			...cellsFor(response, questions)
		];
		lines.push(cells.map(escapeCsv).join(','));
	}

	// BOM UTF-8 : sans lui, un tableur ouvre le fichier en encodage local et les
	// accents deviennent illisibles.
	return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export interface JsonExport {
	readonly survey: {
		readonly slug: string;
		readonly title: string;
		readonly methodology: string | null;
		readonly fieldworkStart: string | null;
		readonly fieldworkEnd: string | null;
	};
	readonly notice: string;
	readonly license: string;
	readonly questions: readonly {
		readonly code: string;
		readonly label: string;
		readonly type: string;
		readonly modalities: readonly { readonly key: string; readonly label: string }[];
	}[];
	readonly responses: readonly Record<string, unknown>[];
}

export const EXPORT_NOTICE =
	'Effectifs bruts, sans pondération ni redressement. Les non-réponses sont comptées comme une modalité. ' +
	"Les valeurs numériques sont regroupées en tranches et les verbatims sont exclus, pour empêcher la réidentification.";

export const EXPORT_LICENSE = "ODbL 1.0 : attribution à Humanitour et partage à l'identique.";

export function toJson(
	survey: {
		slug: string;
		title: string;
		methodology: string | null;
		fieldworkStart: Date | null;
		fieldworkEnd: Date | null;
	},
	responses: readonly ExportableResponse[],
	questions: readonly PublicQuestion[]
): JsonExport {
	return {
		survey: {
			slug: survey.slug,
			title: survey.title,
			methodology: survey.methodology,
			fieldworkStart: survey.fieldworkStart?.toISOString() ?? null,
			fieldworkEnd: survey.fieldworkEnd?.toISOString() ?? null
		},
		notice: EXPORT_NOTICE,
		license: EXPORT_LICENSE,
		questions: questions.map((question) => ({
			code: question.code,
			label: question.label,
			type: question.type,
			modalities: [
				...question.options.map((option) => ({ key: option.code, label: option.label })),
				{ key: NON_RESPONSE_KEY, label: 'Sans réponse' }
			]
		})),
		responses: responses.map((response) => {
			const cells = cellsFor(response, questions);
			const row: Record<string, unknown> = {
				reponse_id: response.id,
				date_collecte: response.collectedAt.toISOString().slice(0, 10)
			};

			questions.forEach((question, index) => {
				row[question.code] = cells[index];
			});

			return row;
		})
	};
}
