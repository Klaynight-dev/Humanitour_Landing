import { MAX_RECIPIENTS, parseRecipients } from '$lib/shared/mail/address';
import { checkAttachments } from '$lib/shared/mail/attachments';

/**
 * Lecture du formulaire de redaction : nouveau message, reponse, transfert.
 *
 * Les trois ecrans postent les memes champs, controles ici une seule fois.
 * Une erreur rend aussi les valeurs saisies : un texte long perdu parce qu'une
 * adresse etait mal tapee, c'est un texte qu'on ne reecrit pas.
 */

export interface ComposeFields {
	readonly to: string;
	readonly cc: string;
	readonly bcc: string;
	readonly subject: string;
	readonly markdown: string;
}

export type ComposeResult =
	| {
			readonly ok: true;
			readonly to: readonly string[];
			readonly cc: readonly string[];
			readonly bcc: readonly string[];
			readonly subject: string;
			readonly markdown: string;
			readonly files: readonly File[];
	  }
	| { readonly ok: false; readonly message: string; readonly values: ComposeFields };

const SUBJECT_MAX = 250;

function field(form: FormData, name: string): string {
	return String(form.get(name) ?? '');
}

/** Les fichiers joints ; un champ fichier vide envoie un `File` sans nom ni contenu. */
function filesOf(form: FormData): File[] {
	return form
		.getAll('files')
		.filter(
			(entry): entry is File => typeof entry !== 'string' && entry.size > 0 && entry.name !== ''
		);
}

export function readCompose(form: FormData): ComposeResult {
	const values: ComposeFields = {
		to: field(form, 'to'),
		cc: field(form, 'cc'),
		bcc: field(form, 'bcc'),
		subject: field(form, 'subject').trim(),
		markdown: field(form, 'markdown')
	};
	const refuse = (message: string): ComposeResult => ({ ok: false, message, values });

	const to = parseRecipients(values.to);
	const cc = parseRecipients(values.cc);
	const bcc = parseRecipients(values.bcc);

	const invalid = [...to.invalid, ...cc.invalid, ...bcc.invalid];
	if (invalid.length > 0) return refuse(`Adresse illisible : « ${invalid.join(' », « ')} ».`);
	if (to.addresses.length === 0) return refuse('Indiquez au moins un destinataire.');

	const total = to.addresses.length + cc.addresses.length + bcc.addresses.length;
	if (total > MAX_RECIPIENTS) {
		return refuse(
			`${total} destinataires : un envoi en compte ${MAX_RECIPIENTS} au plus. Pour écrire à beaucoup de monde, passez par une campagne de l'infolettre.`
		);
	}

	if (values.subject === '') return refuse("L'objet est vide.");
	if (values.subject.length > SUBJECT_MAX)
		return refuse(`L'objet dépasse ${SUBJECT_MAX} caractères.`);
	if (values.markdown.trim() === '') return refuse('Le message est vide.');

	const files = filesOf(form);
	const attachmentError = checkAttachments(files);
	if (attachmentError) return refuse(attachmentError);

	return {
		ok: true,
		to: to.addresses,
		cc: cc.addresses,
		bcc: bcc.addresses,
		subject: values.subject,
		markdown: values.markdown,
		files
	};
}
