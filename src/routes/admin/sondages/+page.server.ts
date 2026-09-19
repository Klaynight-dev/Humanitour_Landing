import { fail, redirect } from '@sveltejs/kit';
import { recordAudit } from '$lib/server/audit';
import { notify } from '$lib/server/notifications/emit';
import { prisma } from '$lib/server/db';
import { readText } from '$lib/server/forms';
import { requirePermission } from '$lib/server/rbac/guard';
import { toSlug, uniqueSlug } from '$lib/shared/slug';
import type { Actions, PageServerLoad } from './$types';

/** Statuts filtrables, dans l'ordre ou le back-office les propose. */
const STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;

type SurveyStatus = (typeof STATUSES)[number];

function readStatus(raw: string | null): SurveyStatus | null {
	// Un statut inconnu dans l'URL ne filtre rien plutot que de vider la liste :
	// une adresse bricolee ne doit pas laisser croire qu'il n'y a aucune enquete.
	return STATUSES.find((status) => status === raw) ?? null;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	requirePermission(locals.user, 'survey.read');

	const search = url.searchParams.get('q')?.trim() ?? '';
	const status = readStatus(url.searchParams.get('statut'));

	const surveys = await prisma.survey.findMany({
		where: {
			status: status ?? undefined,
			// Le titre et le slug : ce sont les deux facons dont l'equipe designe une
			// enquete, a l'oral comme dans une adresse.
			OR: search
				? [
						{ title: { contains: search, mode: 'insensitive' } },
						{ slug: { contains: search, mode: 'insensitive' } }
					]
				: undefined
		},
		orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
		select: {
			id: true,
			slug: true,
			title: true,
			status: true,
			methodology: true,
			publishedAt: true,
			updatedAt: true,
			_count: { select: { responses: true, questions: true } }
		}
	});

	return {
		surveys: surveys.map((survey) => ({
			id: survey.id,
			slug: survey.slug,
			title: survey.title,
			status: survey.status,
			publishedAt: survey.publishedAt,
			updatedAt: survey.updatedAt,
			responseCount: survey._count.responses,
			questionCount: survey._count.questions,
			// Calcule ici plutot que dans la page : la condition de publication est
			// une regle metier, pas une question d'affichage.
			canPublish: Boolean(survey.methodology?.trim()) && survey._count.questions > 0
		})),
		filters: { search, status }
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const user = requirePermission(locals.user, 'survey.write');

		const form = await request.formData();
		const title = readText(form, 'title');

		if (title.length < 3) {
			return fail(400, { message: 'Le titre doit faire au moins trois caracteres.' });
		}

		const taken = await prisma.survey.findMany({ select: { slug: true } });
		const slug = uniqueSlug(toSlug(title), taken.map((row) => row.slug));

		const survey = await prisma.survey.create({ data: { title, slug } });
		await recordAudit({
			actorId: user.id,
			action: 'survey.create',
			entity: 'Survey',
			entityId: survey.id,
			metadata: { slug }
		});

		redirect(303, `/admin/sondages/${survey.id}`);
	},

	publish: async ({ request, locals }) => {
		const user = requirePermission(locals.user, 'survey.publish');

		const form = await request.formData();
		const id = readText(form, 'id');

		const survey = await prisma.survey.findUnique({
			where: { id },
			include: { _count: { select: { questions: true } } }
		});

		if (!survey) return fail(404, { message: 'Sondage introuvable.' });

		// La methodologie conditionne la publication. C'est la promesse centrale du
		// projet : publier un chiffre sans dire comment il a ete obtenu, c'est
		// exactement ce qu'on reproche aux instituts prives.
		if (!survey.methodology?.trim()) {
			return fail(400, {
				message: "Renseignez la methodologie avant de publier : c'est ce qui distingue cette enquete d'un sondage opaque."
			});
		}

		if (survey._count.questions === 0) {
			return fail(400, { message: 'Ajoutez au moins une question avant de publier.' });
		}

		await prisma.survey.update({
			where: { id },
			data: { status: 'PUBLISHED', publishedAt: survey.publishedAt ?? new Date() }
		});

		await recordAudit({
			actorId: user.id,
			action: 'survey.publish',
			entity: 'Survey',
			entityId: id,
			metadata: { slug: survey.slug }
		});

		await notify({
			type: 'survey.published',
			entity: 'Survey',
			entityId: id,
			actorId: user.id,
			data: { title: survey.title, surveyId: id }
		});

		return { message: `« ${survey.title} » est publie.` };
	},

	unpublish: async ({ request, locals }) => {
		const user = requirePermission(locals.user, 'survey.publish');

		const form = await request.formData();
		const id = readText(form, 'id');

		const survey = await prisma.survey.findUnique({ where: { id } });
		if (!survey) return fail(404, { message: 'Sondage introuvable.' });

		// `publishedAt` est conserve : depublier puis republier ne doit pas
		// reecrire la date de premiere parution.
		await prisma.survey.update({ where: { id }, data: { status: 'DRAFT' } });

		await recordAudit({
			actorId: user.id,
			action: 'survey.unpublish',
			entity: 'Survey',
			entityId: id,
			metadata: { slug: survey.slug }
		});

		await notify({
			type: 'survey.unpublished',
			entity: 'Survey',
			entityId: id,
			actorId: user.id,
			data: { title: survey.title, surveyId: id }
		});

		return { message: `« ${survey.title} » est repasse en brouillon.` };
	}
};
