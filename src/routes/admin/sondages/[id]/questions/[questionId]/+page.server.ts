import { error, fail } from '@sveltejs/kit';
import { recordAudit } from '$lib/server/audit';
import { prisma } from '$lib/server/db';
import { readCheckbox, readHexColor, readText } from '$lib/server/forms';
import { requirePermission } from '$lib/server/rbac/guard';
import { requireQuestionType } from '$lib/shared/questions';
import { toColumnKey } from '$lib/shared/slug';
import type { Actions, PageServerLoad } from './$types';

/**
 * Editeur d'une question et de ses modalites.
 *
 * La configuration est saisie en JSON et validee par le REGISTRE : la page ne
 * sait pas ce qu'est une echelle ou une tranche, elle delegue. Ajouter un type
 * de question n'ajoute donc rien ici.
 */

async function loadQuestion(surveyId: string, questionId: string) {
	const question = await prisma.question.findFirst({
		where: { id: questionId, surveyId },
		include: { options: { orderBy: { position: 'asc' } }, _count: { select: { answers: true } } }
	});

	if (!question) error(404, { message: 'Question introuvable.' });
	return question;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	requirePermission(locals.user, 'survey.read');

	const question = await loadQuestion(params.id, params.questionId);
	const type = requireQuestionType(question.type);

	return {
		surveyId: params.id,
		question: {
			id: question.id,
			code: question.code,
			label: question.label,
			help: question.help,
			type: question.type,
			config: JSON.stringify(question.config ?? {}, null, 2),
			isCrossable: question.isCrossable,
			answerCount: question._count.answers
		},
		type: {
			key: type.key,
			label: type.label,
			description: type.description,
			usesOptions: type.usesOptions,
			crossable: type.crossable
		},
		options: question.options.map((option) => ({
			id: option.id,
			code: option.code,
			label: option.label,
			position: option.position,
			isNonResponse: option.isNonResponse,
			color: option.color
		}))
	};
};

export const actions: Actions = {
	save: async ({ request, params, locals }) => {
		const user = requirePermission(locals.user, 'survey.write');
		const form = await request.formData();

		const label = readText(form, 'label');
		if (label.length < 3) return fail(400, { message: 'Le libelle est obligatoire.' });

		const question = await loadQuestion(params.id, params.questionId);
		const type = requireQuestionType(question.type);

		let raw: unknown = {};
		const rawConfig = readText(form, 'config');

		if (rawConfig !== '') {
			try {
				raw = JSON.parse(rawConfig);
			} catch {
				return fail(400, { message: 'La configuration n est pas du JSON valide.' });
			}
		}

		// Le registre est seul juge de ce qui est une configuration valide.
		const parsed = type.parseConfig(raw);
		if (!parsed.ok) return fail(400, { message: `Configuration refusee : ${parsed.reason}` });

		await prisma.question.update({
			where: { id: params.questionId },
			data: {
				label,
				help: readText(form, 'help') || null,
				config: parsed.config as never,
				isCrossable: type.crossable && readCheckbox(form, 'isCrossable')
			}
		});

		await recordAudit({
			actorId: user.id,
			action: 'question.update',
			entity: 'Question',
			entityId: params.questionId,
			metadata: { surveyId: params.id, code: question.code }
		});

		return { message: 'Question enregistree.' };
	},

	addOption: async ({ request, params, locals }) => {
		requirePermission(locals.user, 'survey.write');
		const form = await request.formData();

		const label = readText(form, 'label');
		if (label === '') return fail(400, { message: 'Le libelle de la modalite est obligatoire.' });

		const question = await loadQuestion(params.id, params.questionId);

		const taken = new Set(question.options.map((option) => option.code));
		const base = toColumnKey(label).slice(0, 40) || 'modalite';
		let code = base;
		for (let suffix = 2; taken.has(code); suffix += 1) code = `${base}_${suffix}`;

		const position = question.options.reduce((max, o) => Math.max(max, o.position), -1) + 1;

		await prisma.questionOption.create({
			data: {
				questionId: params.questionId,
				code,
				label,
				position,
				isNonResponse: readCheckbox(form, 'isNonResponse')
			}
		});

		return { message: `Modalite « ${label} » ajoutee.` };
	},

	updateOption: async ({ request, params, locals }) => {
		requirePermission(locals.user, 'survey.write');
		const form = await request.formData();

		const optionId = readText(form, 'optionId');
		const label = readText(form, 'label');
		if (label === '') return fail(400, { message: 'Le libelle est obligatoire.' });

		const option = await prisma.questionOption.findFirst({
			where: { id: optionId, questionId: params.questionId }
		});
		if (!option) return fail(404, { message: 'Modalite introuvable.' });

		await prisma.questionOption.update({
			where: { id: optionId },
			// Le code n'est jamais modifie : il est deja inscrit dans les reponses
			// enregistrees et dans les permaliens partages.
			data: {
				label,
				isNonResponse: readCheckbox(form, 'isNonResponse'),
				color: readHexColor(form, 'color')
			}
		});

		return { message: 'Modalite mise a jour.' };
	},

	deleteOption: async ({ request, params, locals }) => {
		requirePermission(locals.user, 'survey.write');
		const form = await request.formData();
		const optionId = readText(form, 'optionId');

		const option = await prisma.questionOption.findFirst({
			where: { id: optionId, questionId: params.questionId },
			include: { _count: { select: { answers: true } } }
		});
		if (!option) return fail(404, { message: 'Modalite introuvable.' });

		if (option._count.answers > 0) {
			return fail(400, {
				message: `« ${option.label} » porte ${option._count.answers} reponses. La supprimer fausserait les resultats deja publies.`
			});
		}

		await prisma.questionOption.delete({ where: { id: optionId } });
		return { message: 'Modalite supprimee.' };
	}
};
