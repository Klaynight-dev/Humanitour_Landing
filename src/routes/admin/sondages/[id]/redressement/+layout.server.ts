import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { requirePermission } from '$lib/server/rbac/guard';
import {
	readDiagnostics,
	readUsedVariables,
	readVariables,
	sameMargins
} from '$lib/server/survey/weighting-plan';
import { countUnweighted } from '$lib/server/survey/weighting-store';
import type { LayoutServerLoad } from './$types';

/**
 * Le redressement d une enquete, en cinq onglets.
 *
 * Chaque onglet est une route, pas un panneau masque : l ecran fonctionne sans
 * JavaScript (`Tabs.svelte` le deconseille pour cette raison), chaque etape a
 * son adresse, et un formulaire d un onglet ne recharge pas les calculs d un
 * autre. Ce fichier ne charge que ce que tous partagent : l enquete et l etat
 * du dernier calcul.
 */
export const load: LayoutServerLoad = async ({ params, locals }) => {
	requirePermission(locals.user, 'survey.read');

	const survey = await prisma.survey.findUnique({
		where: { id: params.id },
		select: {
			id: true,
			slug: true,
			title: true,
			status: true,
			_count: { select: { responses: true } },
			weighting: { include: { computedBy: { select: { displayName: true } } } }
		}
	});
	if (!survey) error(404, { message: 'Sondage introuvable.' });

	const weighting = survey.weighting;
	const unweighted = weighting?.computedAt ? await countUnweighted(survey.id) : 0;
	const used = readUsedVariables(weighting?.diagnostics);

	return {
		survey: {
			id: survey.id,
			slug: survey.slug,
			title: survey.title,
			status: survey.status,
			responseCount: survey._count.responses
		},
		source: weighting?.source ?? '',
		state: weighting?.computedAt
			? {
					version: weighting.version,
					computedAt: weighting.computedAt,
					computedBy: weighting.computedBy?.displayName ?? null,
					isPublished: weighting.isPublished,
					publishedAt: weighting.publishedAt,
					diagnostics: readDiagnostics(weighting.diagnostics),
					unweighted,
					// Un calcul anterieur au 28 septembre 2026 n a pas enregistre ses
					// marges : on ne peut pas savoir, on ne l affirme donc pas.
					marginsChanged: used !== null && !sameMargins(used, readVariables(weighting.variables))
				}
			: null
	};
};
