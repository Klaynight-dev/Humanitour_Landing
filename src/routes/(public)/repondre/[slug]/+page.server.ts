import { error, fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { fetchPublicForm, submitResponse } from '$lib/server/openforms/api';
import { OpenformsError } from '$lib/server/openforms/client';
import { syncSurvey } from '$lib/server/openforms/sync';
import { inspectForm } from '$lib/shared/openforms/usability';
import { buildSubmission, readFormValues, validateAll } from '$lib/shared/openforms/submission';
import type { Actions, PageServerLoad } from './$types';

/**
 * Repondre a une enquete en cours, sur `humanitour.fr`.
 *
 * Le questionnaire est RENDU ICI, pas encadre : ni iframe, ni script tiers, ni
 * cookie supplementaire (AGENTS.md section 6). Sa definition est lue chez
 * Openforms a chaque visite, parce que c'est elle qui fait autorite : un champ
 * ajoute la-bas apparait ici sans redeploiement.
 *
 * La reponse, elle, part chez Openforms. Ce site ne l'ecrit pas directement
 * dans sa propre base : la faire transiter par le canal unique garantit qu'une
 * reponse deposee ici et une reponse deposee sur `forms.humanitour.fr`
 * subissent exactement les memes controles, et qu'aucune ne peut exister d'un
 * cote sans exister de l'autre.
 */

/** L'enquete, si elle est bien ouverte aux reponses en ce moment. */
async function loadOpenSurvey(slug: string) {
	const survey = await prisma.survey.findUnique({
		where: { slug },
		select: {
			id: true,
			slug: true,
			title: true,
			subtitle: true,
			status: true,
			openformsSlug: true,
			openformsOpen: true,
			opensAt: true,
			closesAt: true
		}
	});

	if (!survey || survey.status !== 'PUBLISHED' || !survey.openformsSlug) {
		error(404, { message: 'Enquête introuvable.' });
	}

	const now = new Date();
	const notYet = survey.opensAt !== null && survey.opensAt > now;
	const over = survey.closesAt !== null && survey.closesAt < now;

	if (!survey.openformsOpen || notYet || over) {
		error(410, {
			message: "Cette enquête n'accepte plus de réponses. Ses résultats restent consultables."
		});
	}

	return survey;
}

export const load: PageServerLoad = async ({ params }) => {
	const survey = await loadOpenSurvey(params.slug);

	let form;
	try {
		form = await fetchPublicForm(survey.openformsSlug!);
	} catch (cause) {
		// 503 et non 500 : le questionnaire existe, c'est le service qui ne repond
		// pas. Le visiteur peut reessayer, et les moteurs ne desindexent pas la
		// page pour une panne passagere.
		error(503, {
			message:
				cause instanceof OpenformsError
					? cause.message
					: 'Le service de formulaires est momentanément indisponible.'
		});
	}

	const report = inspectForm(form);

	return {
		survey: { slug: survey.slug, title: survey.title, subtitle: survey.subtitle },
		form: {
			title: form.title,
			description: form.description,
			requireConsent: form.requireConsent,
			consentText: form.consentText,
			privacyPolicyUrl: form.privacyPolicyUrl
		},
		fields: report.fields,
		/**
		 * Questionnaire non servable ici : la page l'annonce et renvoie vers
		 * Openforms, qui sait le rendre. Mieux vaut un renvoi assume qu'un
		 * formulaire ampute dont la soumission echouerait.
		 */
		servable: report.servable,
		remoteUrl: `https://forms.humanitour.fr/f/${survey.openformsSlug}`
	};
};

/**
 * Toute issue negative rend la MEME forme.
 *
 * Sans cela, le type de `form` cote page devient une union dont certaines
 * branches n'ont ni `errors` ni `values`, et la page doit tester la presence de
 * chaque champ avant de le lire. Une forme unique supprime ce cas particulier
 * (AGENTS.md section 1.2) et garantit surtout qu'un refus ne vide jamais le
 * questionnaire deja rempli.
 */
function refuse(
	status: number,
	message: string,
	values: Record<string, unknown> = {},
	errors: Record<string, string> = {}
) {
	return fail(status, { message, errors, values });
}

export const actions: Actions = {
	default: async ({ request, params, getClientAddress }) => {
		const survey = await loadOpenSurvey(params.slug);

		let remote;
		try {
			remote = await fetchPublicForm(survey.openformsSlug!);
		} catch {
			return refuse(
				503,
				'Le service de formulaires est momentanément indisponible. Votre réponse n’a pas été enregistrée, réessayez dans un instant.'
			);
		}

		const report = inspectForm(remote);
		if (!report.servable) {
			return refuse(400, 'Ce questionnaire doit être rempli sur forms.humanitour.fr.');
		}

		const body = await request.formData();
		const values = readFormValues(report.fields, body);
		const consent = body.get('consentement') === 'on';

		if (remote.requireConsent && !consent) {
			return refuse(
				400,
				'Le consentement est nécessaire pour enregistrer votre réponse.',
				values as Record<string, unknown>
			);
		}

		const errors = validateAll(report.fields, values);
		if (Object.keys(errors).length > 0) {
			return refuse(
				400,
				'Quelques réponses demandent une correction.',
				values as Record<string, unknown>,
				errors
			);
		}

		try {
			await submitResponse({
				formId: remote.id,
				data: buildSubmission(report.fields, values),
				consent,
				// L'adresse du repondant, pour que le quota distant s'applique a lui
				// et non a ce serveur, par lequel passent toutes les reponses.
				forwardedFor: getClientAddress()
			});
		} catch (cause) {
			if (cause instanceof OpenformsError) {
				return refuse(
					cause.status ?? 400,
					cause.message,
					values as Record<string, unknown>,
					cause.details ?? {}
				);
			}
			throw cause;
		}

		/*
		 * Reprise immediate, sans attendre le webhook ni la minuterie.
		 *
		 * Elle est volontairement NON bloquante pour le repondant : sa reponse est
		 * deja enregistree chez Openforms, qui fait foi. Si la reprise echoue, la
		 * passe suivante la rattrapera, puisque la synchronisation est idempotente.
		 */
		syncSurvey(survey.id, 'SUBMISSION').catch((cause) =>
			console.error('[openforms] reprise immediate impossible :', cause)
		);

		redirect(303, `/repondre/${params.slug}/merci`);
	}
};
