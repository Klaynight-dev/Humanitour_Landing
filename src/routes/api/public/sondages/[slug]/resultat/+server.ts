import { parseExploreParams } from '$shared/explore';
import { publicError, publicJson } from '$lib/server/api/public';
import { buildOutcome, describeDropped, outcomeToJson } from '$lib/server/survey/explore';
import { getPublishedSurvey, prepareExplore } from '$lib/server/survey/queries';
import type { RequestHandler } from './$types';

/**
 * Une distribution ou un croisement, calcule a la demande.
 *
 * Meme adresse, memes parametres et MEME code de calcul que l explorateur de
 * `/donnees/[slug]` : c est ce point d entree que la page appelle quand le
 * visiteur change d axe sans recharger. Un chiffre lu ici et un chiffre lu a
 * l ecran ne peuvent donc pas differer, puisqu ils sortent de la meme fonction.
 */
export const GET: RequestHandler = async ({ params, url }) => {
	const survey = await getPublishedSurvey(params.slug);
	if (!survey) return publicError(404, "Cette enquête n'existe pas ou n'est pas publiée.");

	const requested = parseExploreParams(url.searchParams);
	const prepared = await prepareExplore(survey, requested);
	if (!prepared) {
		return publicError(422, 'Cette enquête ne comporte aucune question exploitable.');
	}

	const outcome = buildOutcome({
		x: prepared.x,
		y: prepared.y,
		population: prepared.population,
		threshold: prepared.threshold,
		includeNonResponses: requested.includeNonResponses
	});

	const tooSmall = outcome.kind === 'too-small';

	return publicJson({
		sondage: { slug: survey.slug, titre: survey.title },
		selection: {
			x: prepared.x.code,
			xLibelle: prepared.x.label,
			y: prepared.y?.code ?? null,
			yLibelle: prepared.y?.label ?? null,
			nonReponsesAffichees: requested.includeNonResponses,
			filtres: requested.filters.map((clause) => ({
				question: clause.questionCode,
				modalites: clause.modalityKeys
			}))
		},
		population: {
			// L effectif d une sous-population sous le seuil est lui-meme un
			// agregat identifiant : il ne sort pas (AGENTS.md section 4).
			effectif: tooSmall ? null : prepared.population.size,
			total: prepared.population.total,
			filtree: prepared.population.restricted,
			seuil: prepared.threshold
		},
		resultat: outcomeToJson(outcome),
		avertissements: [
			describeDropped(prepared.dropped),
			tooSmall
				? `Cette combinaison porte sur moins de ${prepared.threshold} répondants : publier un chiffre ici permettrait d'identifier une personne.`
				: null
		].filter((message): message is string => message !== null)
	});
};
