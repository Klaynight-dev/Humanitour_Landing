import { pageBlocks } from '$lib/server/content/queries';
import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

/**
 * Les enquetes en cours, celles auxquelles on peut encore repondre.
 *
 * La liste vient du MIROIR, pas d'Openforms : cette page doit se rendre en SSR
 * et rester debout si le service de formulaires est momentanement
 * indisponible. Le formulaire lui-meme, lui, est bien lu chez Openforms au
 * moment ou on l'ouvre — c'est la que la verite doit etre fraiche.
 *
 * « En cours » se lit sur trois conditions, dans l'ordre ou elles se verifient :
 * le formulaire est ouvert, sa fenetre de collecte est commencee, et elle n'est
 * pas terminee. Le quota, lui, n'est pas verifie ici : Openforms le compte et
 * le refuse a la soumission, et le recopier donnerait un compteur qui retarde.
 */
export const load: PageServerLoad = async () => {
	const now = new Date();

	const surveys = await prisma.survey.findMany({
		where: {
			status: 'PUBLISHED',
			openformsOpen: true,
			openformsSlug: { not: null },
			AND: [
				{ OR: [{ opensAt: null }, { opensAt: { lte: now } }] },
				{ OR: [{ closesAt: null }, { closesAt: { gte: now } }] }
			]
		},
		orderBy: { publishedAt: 'desc' },
		select: {
			slug: true,
			title: true,
			subtitle: true,
			description: true,
			closesAt: true,
			_count: { select: { responses: true } }
		}
	});

	return {
		blocks: await pageBlocks('ANSWER'),
		surveys: surveys.map((survey) => ({
			slug: survey.slug,
			title: survey.title,
			subtitle: survey.subtitle,
			description: survey.description,
			closesAt: survey.closesAt,
			responses: survey._count.responses
		}))
	};
};
