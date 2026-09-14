import { error, fail, redirect } from '@sveltejs/kit';
import { recordAudit } from '$lib/server/audit';
import { prisma } from '$lib/server/db';
import {
	detectImportFormat,
	getImportFormat,
	IdentifyingDataError,
	IMPORT_FORMATS,
	mapRows,
	suggestMapping,
	type ColumnMapping,
	type ImportableQuestion,
	type RowSet
} from '$lib/server/import';
import { readPrefixed, readText } from '$lib/server/forms';
import { requirePermission } from '$lib/server/rbac/guard';
import { safeKeySegment, storage } from '$lib/server/storage';
import type { Actions, PageServerLoad } from './$types';

/**
 * Import de reponses.
 *
 * Trois temps, volontairement separes : deposer, verifier, confirmer. On ne
 * doit jamais decouvrir apres coup qu'un fichier a rempli la base de travers.
 * Le fichier d'origine est conserve : c'est lui qui fait foi si un resultat est
 * conteste.
 */

/** 20 Mo : un fichier de reponses honnete n'atteint pas cette taille. */
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

async function loadQuestions(surveyId: string): Promise<ImportableQuestion[]> {
	const questions = await prisma.question.findMany({
		where: { surveyId },
		orderBy: { position: 'asc' },
		include: { options: { orderBy: { position: 'asc' } } }
	});

	return questions.map((question) => ({
		code: question.code,
		label: question.label,
		type: question.type,
		config: (question.config ?? {}) as Record<string, unknown>,
		options: question.options.map((option) => ({
			code: option.code,
			label: option.label,
			position: option.position,
			isNonResponse: option.isNonResponse,
			color: option.color
		}))
	}));
}

/** Relit le fichier depose et le reparse. Le lot ne stocke pas les lignes. */
async function reparse(batchId: string, surveyId: string): Promise<{ rowSet: RowSet; batch: Awaited<ReturnType<typeof prisma.importBatch.findFirst>> }> {
	const batch = await prisma.importBatch.findFirst({ where: { id: batchId, surveyId } });
	if (!batch) error(404, { message: 'Lot d import introuvable.' });

	const format = getImportFormat(batch.format);
	if (!format) error(400, { message: `Format « ${batch.format} » inconnu.` });

	const content = await storage().get(storageKey(surveyId, batchId, batch.filename));
	return { rowSet: format.parse(content), batch };
}

function storageKey(surveyId: string, batchId: string, filename: string): string {
	return `imports/${surveyId}/${batchId}-${safeKeySegment(filename)}`;
}

export const load: PageServerLoad = async ({ params, locals, url }) => {
	requirePermission(locals.user, 'survey.import');

	const survey = await prisma.survey.findUnique({
		where: { id: params.id },
		select: { id: true, title: true, slug: true }
	});
	if (!survey) error(404, { message: 'Sondage introuvable.' });

	const [questions, batches] = await Promise.all([
		loadQuestions(params.id),
		prisma.importBatch.findMany({
			where: { surveyId: params.id },
			orderBy: { createdAt: 'desc' },
			take: 20,
			include: { createdBy: { select: { displayName: true } } }
		})
	]);

	const current = url.searchParams.get('lot');
	if (!current) {
		return {
			survey,
			questions,
			batches: batches.map(toBatchView),
			formats: IMPORT_FORMATS.map((format) => ({
				key: format.key,
				label: format.label,
				extensions: format.extensions
			})),
			active: null
		};
	}

	// Un lot en cours : on relit le fichier pour proposer la correspondance.
	const { rowSet, batch } = await reparse(current, params.id);

	return {
		survey,
		questions,
		batches: batches.map(toBatchView),
		formats: IMPORT_FORMATS.map((format) => ({
			key: format.key,
			label: format.label,
			extensions: format.extensions
		})),
		active: {
			id: current,
			filename: batch!.filename,
			status: batch!.status,
			columns: rowSet.columns,
			rowCount: rowSet.rows.length,
			mapping: (batch!.mapping ?? {}) as ColumnMapping,
			errors: (batch!.errors ?? []) as { line: number; column: string; value: string; reason: string }[],
			acceptedCount: batch!.acceptedCount,
			rejectedCount: batch!.rejectedCount,
			// Un apercu des premieres lignes : lire trois valeurs reelles vaut mieux
			// que deviner a quoi correspond une colonne.
			sample: rowSet.rows.slice(0, 3)
		}
	};
};

function toBatchView(batch: {
	id: string;
	filename: string;
	format: string;
	status: string;
	rowCount: number;
	acceptedCount: number;
	rejectedCount: number;
	createdAt: Date;
	committedAt: Date | null;
	createdBy: { displayName: string } | null;
}) {
	return {
		id: batch.id,
		filename: batch.filename,
		format: batch.format,
		status: batch.status,
		rowCount: batch.rowCount,
		acceptedCount: batch.acceptedCount,
		rejectedCount: batch.rejectedCount,
		createdAt: batch.createdAt,
		committedAt: batch.committedAt,
		author: batch.createdBy?.displayName ?? null
	};
}

export const actions: Actions = {
	upload: async ({ request, params, locals }) => {
		const user = requirePermission(locals.user, 'survey.import');

		const form = await request.formData();
		const file = form.get('file');

		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { message: 'Choisissez un fichier.' });
		}

		if (file.size > MAX_UPLOAD_BYTES) {
			return fail(400, { message: 'Fichier trop volumineux (20 Mo maximum).' });
		}

		const format = detectImportFormat(file.name, file.type);
		if (!format) {
			return fail(400, {
				message: `Format non reconnu. Formats acceptes : ${IMPORT_FORMATS.map((f) => f.label).join(', ')}.`
			});
		}

		const content = new Uint8Array(await file.arrayBuffer());

		let rowSet: RowSet;
		try {
			rowSet = format.parse(content);
		} catch (parseError) {
			return fail(400, {
				message: `Lecture impossible : ${parseError instanceof Error ? parseError.message : 'fichier illisible'}`
			});
		}

		const questions = await loadQuestions(params.id);
		if (questions.length === 0) {
			return fail(400, { message: "Ajoutez des questions a l'enquete avant d'importer des reponses." });
		}

		const batch = await prisma.importBatch.create({
			data: {
				surveyId: params.id,
				filename: file.name,
				format: format.key,
				source: 'UPLOAD',
				rowCount: rowSet.rows.length,
				mapping: suggestMapping(rowSet, questions) as never,
				createdById: user.id
			}
		});

		// Le fichier est conserve tel quel : il fait foi si un resultat publie est
		// conteste, et permet de rejouer l'import sans redemander le fichier.
		await storage().put(
			storageKey(params.id, batch.id, file.name),
			content,
			file.type || 'application/octet-stream'
		);

		await recordAudit({
			actorId: user.id,
			action: 'import.upload',
			entity: 'ImportBatch',
			entityId: batch.id,
			metadata: { surveyId: params.id, filename: file.name, rows: rowSet.rows.length }
		});

		redirect(303, `/admin/sondages/${params.id}/import?lot=${batch.id}`);
	},

	preview: async ({ request, params, locals }) => {
		requirePermission(locals.user, 'survey.import');

		const form = await request.formData();
		const batchId = readText(form, 'batchId');

		const { rowSet } = await reparse(batchId, params.id);
		const questions = await loadQuestions(params.id);

		// La correspondance vient du formulaire : chaque champ s'appelle
		// « map:<code de question> ».
		const mapping = readPrefixed(form, 'map:');

		if (Object.keys(mapping).length === 0) {
			return fail(400, { message: 'Associez au moins une colonne a une question.' });
		}

		try {
			const report = mapRows(rowSet, questions, mapping);

			await prisma.importBatch.update({
				where: { id: batchId },
				data: {
					mapping: mapping as never,
					status: 'VALIDATED',
					acceptedCount: report.accepted.length,
					rejectedCount: report.rejected.length,
					// On garde les cinquante premiers rejets : au-dela, c'est le fichier
					// qui est a reprendre, pas les lignes a corriger une a une.
					errors: report.rejected.slice(0, 50) as never
				}
			});

			return {
				message: `${report.accepted.length} lignes pretes, ${report.rejected.length} refusees.`
			};
		} catch (mapError) {
			if (mapError instanceof IdentifyingDataError) {
				await prisma.importBatch.update({
					where: { id: batchId },
					data: { status: 'REJECTED', errors: [{ reason: mapError.message }] as never }
				});
				return fail(400, { message: mapError.message });
			}
			throw mapError;
		}
	},

	commit: async ({ request, params, locals }) => {
		const user = requirePermission(locals.user, 'survey.import');

		const form = await request.formData();
		const batchId = readText(form, 'batchId');

		const { rowSet, batch } = await reparse(batchId, params.id);
		if (batch!.status === 'COMMITTED') {
			return fail(400, { message: 'Ce lot a deja ete importe.' });
		}

		const questions = await loadQuestions(params.id);
		const report = mapRows(rowSet, questions, (batch!.mapping ?? {}) as ColumnMapping);

		if (report.accepted.length === 0) {
			return fail(400, { message: 'Aucune ligne valide a importer.' });
		}

		// Correspondance code de question et code de modalite vers identifiants.
		const questionRows = await prisma.question.findMany({
			where: { surveyId: params.id },
			include: { options: true }
		});

		const questionIds = new Map(questionRows.map((q) => [q.code, q.id]));
		const optionIds = new Map(
			questionRows.flatMap((q) => q.options.map((o) => [`${q.code} ${o.code}`, o.id]))
		);

		const collectedAt = new Date();

		// Une transaction : un import a moitie applique laisserait des repondants
		// incomplets, donc des croisements faux.
		await prisma.$transaction(
			report.accepted.map((row) =>
				prisma.response.create({
					data: {
						surveyId: params.id,
						collectedAt,
						source: 'UPLOAD',
						importBatchId: batchId,
						answers: {
							create: row.answers.map((answer) => ({
								questionId: questionIds.get(answer.questionCode)!,
								optionId: answer.optionCode
									? (optionIds.get(`${answer.questionCode} ${answer.optionCode}`) ?? null)
									: null,
								modalityKey: answer.modalityKey,
								valueNumber: answer.valueNumber,
								valueText: answer.valueText
							}))
						}
					}
				})
			)
		);

		await prisma.importBatch.update({
			where: { id: batchId },
			data: {
				status: 'COMMITTED',
				committedAt: new Date(),
				acceptedCount: report.accepted.length,
				rejectedCount: report.rejected.length
			}
		});

		await recordAudit({
			actorId: user.id,
			action: 'import.commit',
			entity: 'ImportBatch',
			entityId: batchId,
			metadata: {
				surveyId: params.id,
				accepted: report.accepted.length,
				rejected: report.rejected.length
			}
		});

		redirect(303, `/admin/sondages/${params.id}/import`);
	},

	discard: async ({ request, params, locals }) => {
		const user = requirePermission(locals.user, 'survey.import');

		const form = await request.formData();
		const batchId = readText(form, 'batchId');

		const batch = await prisma.importBatch.findFirst({
			where: { id: batchId, surveyId: params.id }
		});
		if (!batch) return fail(404, { message: 'Lot introuvable.' });

		// Les reponses sont supprimees EXPLICITEMENT avant le lot.
		//
		// La cle etrangere est en `SetNull` — ce qui est le bon reglage pour le
		// schema, un nettoyage de lot ne devant pas emporter des reponses — mais
		// annuler un import veut dire retirer ce qu'il a insere. Sans cette
		// suppression, les reponses resteraient en base, orphelines et invisibles
		// dans l'historique des lots.
		const removed = await prisma.response.deleteMany({ where: { importBatchId: batchId } });
		await prisma.importBatch.delete({ where: { id: batchId } });
		await storage()
			.remove(storageKey(params.id, batchId, batch.filename))
			.catch(() => undefined);

		await recordAudit({
			actorId: user.id,
			action: 'import.discard',
			entity: 'ImportBatch',
			entityId: batchId,
			metadata: {
				surveyId: params.id,
				filename: batch.filename,
				responsesRemoved: removed.count
			}
		});

		redirect(303, `/admin/sondages/${params.id}/import`);
	}
};
