import type { FieldTypeDefinition } from '../types';

/**
 * Champs qu'Humanitour ne propose jamais.
 *
 * Deux motifs, et ils ne se confondent pas.
 *
 * DONNEE IDENTIFIANTE — courriel, adresse postale, signature, fichier depose.
 * L'association recueille des opinions politiques, donnee sensible au sens de
 * l'article 9 du RGPD : un nom ou un courriel a cote suffit a reidentifier le
 * repondant (AGENTS.md section 4). Ces champs ne sont pas masques a l'ecran
 * puis envoyes quand meme — ils ne sont ni affiches, ni soumis, et s'ils sont
 * OBLIGATOIRES chez Openforms, le questionnaire entier est refuse sur
 * `humanitour.fr` plutot que soumis amoindri (voir `usability.ts`).
 *
 * MODULE DE DEMONSTRATION — `stripe_payment` n'effectue aucune transaction
 * reelle, y compris dans Openforms. Il n'a rien a faire sur le site d'une
 * association qui encaisse par HelloAsso.
 */
function excluded(key: string, label: string, identifying: boolean): FieldTypeDefinition {
	return {
		key,
		label,
		carriesAnswer: false,
		identifying,
		questionType: null,

		blank: () => '',
		validate: () => null,
		toSubmission: () => undefined,
		readForm: () => '',
		toCell: () => undefined
	};
}

export const email = excluded('email', 'Adresse de courriel', true);
export const file = excluded('file', 'Fichier déposé', true);
export const signature = excluded('signature', 'Signature manuscrite', true);
export const address = excluded('address', 'Adresse postale', true);
export const stripePayment = excluded('stripe_payment', 'Paiement (démonstration)', false);
