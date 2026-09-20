import type { FieldValue, OpenformsField } from '$lib/shared/openforms/types';

/**
 * Contrat commun a tous les composants de champ.
 *
 * Le meme jeu de proprietes pour tous, sans exception : c'est ce qui permet a
 * `Field.svelte` de monter n'importe quel type sans le connaitre, donc sans le
 * moindre `switch` dans le rendu (AGENTS.md section 2).
 *
 * Le LIBELLE, l'aide et le message d'erreur ne sont PAS rendus par le
 * composant : `Field.svelte` s'en charge pour tous. Un libelle rendu quinze
 * fois serait associe a son controle de quinze facons differentes, et
 * l'accessibilite s'y perdrait a la premiere distraction.
 */
export interface FieldProps {
	readonly field: OpenformsField;
	/**
	 * Saisie courante, liee dans les deux sens.
	 *
	 * `undefined` est tolere : l'etat du formulaire est indexe par cle, et un
	 * champ apparu chez Openforms depuis le dernier rendu n'y figure pas encore.
	 * Chaque widget le lit comme un vide plutot que de faire tomber la page.
	 */
	value: FieldValue | undefined;
	/** Motif de refus, s'il y en a un. Le composant s'en sert pour `aria-invalid`. */
	readonly error?: string;
	/** Identifiants des textes decrivant le champ, pour `aria-describedby`. */
	readonly describedBy: string | undefined;
}

/** Habillage commun des controles de saisie du site public. */
export const CONTROL_CLASS =
	'border-ink/25 bg-paper rounded-field min-h-11 w-full border px-3 py-2.5 text-base';
