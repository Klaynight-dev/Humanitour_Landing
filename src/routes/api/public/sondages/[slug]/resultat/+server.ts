import { parseExploreParams } from '$shared/explore';
import { publicError, publicJson } from '$lib/server/api/public';
import {
	buildOutcome,
	buildPanels,
	describeDropped,
	describeUnavailableWeighting,
	outcomeToJson
} from '$lib/server/survey/explore';
import {
	filterableQuestions,
	getPublishedSurvey,
	prepareExplore
} from '$lib/server/survey/queries';
import { describeWeighting } from '$lib/server/survey/weighting-plan';
import type { Axis } from '$lib/server/survey/explore';
import type { RequestHandler } from './$types';

/** Ce que la requete a demande, tel que la reponse le renvoie. */
function describeSelection(
	prepared: { x: Axis; y: Axis | null; z: Axis | null },
	requested: ReturnType<typeof parseExploreParams>
) {
	return {
		x: prepared.x.code,
		xLibelle: prepared.x.label,
		y: prepared.y?.code ?? null,
		yLibelle: prepared.y?.label ?? null,
		z: prepared.z?.code ?? null,
		zLibelle: prepared.z?.label ?? null,
		nonReponsesAffichees: requested.includeNonResponses,
		filtres: requested.filters.map((clause) => ({
			question: clause.questionCode,
			modalites: clause.modalityKeys
		}))
	};
}

/**
 * Les panneaux d un decoupage par une troisieme question.
 *
 * Chacun est protege SEPAREMENT par le seuil : un panneau trop petit ne sort ni
 * ses cellules ni son effectif, seulement sa modalite. Sans decoupage demande,
 * il n y a pas de panneaux, et le resultat unique tient la place.
 */
function panelsToJson(
	inputs: Parameters<typeof buildPanels>[0],
	z: Parameters<typeof buildPanels>[1] | null
) {
	if (!z) return null;

	return buildPanels(inputs, z).map((panel) => ({
		modalite: panel.key,
		libelle: panel.label,
		nonReponse: panel.isNonResponse,
		effectif: panel.size,
		resultat: outcomeToJson(panel.outcome)
	}));
}

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

	const inputs = {
		x: prepared.x,
		y: prepared.y,
		population: prepared.population,
		threshold: prepared.threshold,
		includeNonResponses: requested.includeNonResponses,
		weights: prepared.weights
	};

	const outcome = buildOutcome(inputs);
	const tooSmall = outcome.kind === 'too-small';

	const panels = panelsToJson(inputs, prepared.z);

	return publicJson({
		sondage: { slug: survey.slug, titre: survey.title },
		selection: describeSelection(prepared, requested),
		// La lecture servie, toujours explicite : un script qui recupere des
		// chiffres redresses doit le savoir sans relire l adresse qu il a appelee.
		lecture: prepared.weights ? 'redressee' : 'brute',
		redressement: prepared.weighting
			? describeWeighting(prepared.weighting, filterableQuestions(survey))
			: null,
		population: {
			// L effectif d une sous-population sous le seuil est lui-meme un
			// agregat identifiant : il ne sort pas (AGENTS.md section 4).
			effectif: tooSmall ? null : prepared.population.size,
			total: prepared.population.total,
			filtree: prepared.population.restricted,
			seuil: prepared.threshold
		},
		resultat: panels ? null : outcomeToJson(outcome),
		panneaux: panels,
		avertissements: [
			describeDropped(prepared.dropped),
			describeUnavailableWeighting(prepared),
			tooSmall
				? `Cette combinaison porte sur moins de ${prepared.threshold} répondants : publier un chiffre ici permettrait d'identifier une personne.`
				: null
		].filter((message): message is string => message !== null)
	});
};
