import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { prisma } from '$lib/server/db';
import { syncSurvey } from '$lib/server/openforms/sync';
import type { RequestHandler } from './$types';

/**
 * Notification de soumission envoyee par Openforms.
 *
 * LE CORPS N'EST PAS CRU. C'est la decision qui structure cette route :
 * Openforms envoie bien les valeurs de la reponse, mais les enregistrer telles
 * quelles ferait de cette URL un point d'injection — n'importe qui pourrait y
 * deposer des reponses fabriquees. Le webhook ne sert donc que de SIGNAL :
 * « quelque chose a bouge, va le chercher ». La synchronisation relit ensuite
 * les donnees chez Openforms avec la cle de lecture, qui, elle, fait autorite.
 *
 * Trois consequences agreables :
 *
 *   - aucune signature a verifier, donc rien a modifier chez Openforms : le
 *     champ `webhookUrl` de chaque formulaire suffit ;
 *   - un appel rejoue n'ajoute rien, la synchronisation etant idempotente ;
 *   - une notification perdue n'est pas une reponse perdue, la minuterie
 *     rattrapant la soumission au tour suivant.
 *
 * Le jeton partage n'authentifie donc pas la DONNEE, il limite seulement qui
 * peut declencher une passe. C'est la seule chose qu'il ait a faire.
 *
 * Configuration chez Openforms : reglages du formulaire, champ « Webhook »,
 * `https://humanitour.fr/api/openforms/webhook?jeton=<OPENFORMS_WEBHOOK_TOKEN>`.
 */

/** Le corps attendu, reduit a ce qui sert reellement : de quel formulaire. */
interface WebhookPayload {
	readonly formId?: unknown;
}

export const POST: RequestHandler = async ({ request, url }) => {
	const expected = env.OPENFORMS_WEBHOOK_TOKEN?.trim();

	// Sans jeton configure, la route est fermee. Un webhook ouvert a tous
	// laisserait n'importe qui declencher des passes en rafale.
	if (!expected) {
		return json({ error: 'Le webhook Openforms n’est pas configuré.' }, { status: 503 });
	}

	const provided = url.searchParams.get('jeton') ?? '';
	if (provided !== expected) {
		return json({ error: 'Jeton invalide.' }, { status: 403 });
	}

	const payload = (await request.json().catch(() => null)) as WebhookPayload | null;
	const formId = typeof payload?.formId === 'string' ? payload.formId : null;
	if (!formId) {
		return json({ error: 'Charge utile sans identifiant de formulaire.' }, { status: 400 });
	}

	const survey = await prisma.survey.findUnique({
		where: { openformsFormId: formId },
		select: { id: true }
	});

	// 202 et non 404 : le formulaire existe chez Openforms, il n'est simplement
	// relie a aucune enquete ici. Rendre une erreur ferait accumuler des echecs
	// dans ses journaux pour une situation parfaitement normale.
	if (!survey) {
		return json({ ignored: 'Aucune enquête n’est reliée à ce formulaire.' }, { status: 202 });
	}

	const outcome = await syncSurvey(survey.id, 'WEBHOOK');

	// L'echec est rendu en 200 avec son motif : il est deja journalise ici, et
	// un 500 ferait rejouer Openforms sur une panne qui ne vient pas de lui.
	return json({
		synced: outcome.created,
		fetched: outcome.fetched,
		rejected: outcome.rejected,
		failure: outcome.failure
	});
};
