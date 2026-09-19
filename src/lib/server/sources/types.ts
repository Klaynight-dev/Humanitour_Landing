import type { RowSet } from '../import/types';

/**
 * Contrat du registre des SOURCES de donnees.
 *
 * Une source va chercher des reponses ailleurs et les rend sous la meme forme
 * qu un fichier importe : un `RowSet`. Tout l aval, correspondance des
 * colonnes, normalisation par type de question, rapport de rejets, est donc
 * partage avec l import de fichiers, sans une ligne de code en double.
 *
 * C est ce qui distingue une source d un `ImportFormat` : un format lit des
 * OCTETS (`parse(Uint8Array)`), une source lit un SERVICE. Les deux finissent
 * sur `RowSet`, et c est le seul point commun dont la chaine a besoin.
 */

/** Un champ du formulaire distant, deja traduit en vocabulaire Humanitour. */
export interface RemoteField {
	/** Cle du champ chez la source. Sert de nom de colonne dans le `RowSet`. */
	readonly key: string;
	readonly label: string;
	/** Type d origine, conserve tel quel pour que le rapport reste lisible. */
	readonly remoteType: string;
	/** Type de question Humanitour correspondant. */
	readonly questionType: string;
	readonly options: readonly { readonly code: string; readonly label: string }[];
}

/**
 * Champ ecarte, avec sa raison.
 *
 * Un import ne masque jamais un rejet (voir `mapper.ts`) : la meme regle vaut
 * pour les champs. Un champ absent du resultat sans explication laisserait
 * croire que la source ne l a jamais eu.
 */
export interface SkippedField {
	readonly key: string;
	readonly label: string;
	readonly remoteType: string;
	readonly reason: string;
	/** Vrai si le champ a ete ecarte parce qu il porte une donnee identifiante. */
	readonly identifying: boolean;
}

export interface RemoteForm {
	readonly id: string;
	readonly title: string;
	readonly fields: readonly RemoteField[];
}

export interface SourceResult {
	readonly form: RemoteForm;
	/** Les reponses, une ligne par soumission, colonnes = cles des champs retenus. */
	readonly rowSet: RowSet;
	readonly skipped: readonly SkippedField[];
	/** Nombre de soumissions renvoyees par la source, avant toute exclusion. */
	readonly submissions: number;
}

export interface DataSource {
	/** Valeur stockee dans `ImportBatch.format`. Contrat : jamais renommee. */
	readonly key: string;
	readonly label: string;
	/** Vrai si la configuration necessaire est presente dans l environnement. */
	isConfigured(): boolean;
	/** Liste les formulaires accessibles avec les droits de la cle. */
	listForms(): Promise<readonly { readonly id: string; readonly title: string }[]>;
	/** Recupere un formulaire et toutes ses reponses. */
	fetchForm(formId: string): Promise<SourceResult>;
}

/** Erreur de dialogue avec une source : reseau, droits, forme inattendue. */
export class SourceError extends Error {
	constructor(
		readonly source: string,
		message: string,
		readonly status?: number
	) {
		super(message);
		this.name = 'SourceError';
	}
}
