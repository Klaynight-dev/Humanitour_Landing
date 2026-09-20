/**
 * Contrat du registre des types de champ Openforms.
 *
 * Openforms est le seul canal de collecte : son schema de formulaire est donc
 * le seul format d'entree que ce depot ait a comprendre. Ce registre remplace
 * l'ancien registre des formats de fichier, et repond aux quatre questions que
 * pose un champ distant, au meme endroit :
 *
 *   1. RENDU     — quelle valeur vide, quelle saisie est acceptable.
 *   2. ENVOI     — sous quelle forme `POST /responses/submit` l'attend.
 *   3. LECTURE   — comment aplatir la valeur renvoyee par la synchronisation.
 *   4. ANALYSE   — quel type de question Humanitour la recoit, s'il y en a un.
 *
 * Ajouter un type de champ = ajouter un fichier dans `fields/` et l'inscrire
 * dans `fields/index.ts`. Aucun `switch` ailleurs (AGENTS.md section 2).
 */

/** Une option de choix, telle qu'Openforms l'ecrit. */
export interface OpenformsOption {
	readonly value: string;
	readonly label: string;
	readonly color?: string;
}

/** Les bornes declarees au builder Openforms. */
export interface OpenformsValidation {
	readonly minLength?: number;
	readonly maxLength?: number;
	readonly pattern?: string;
	readonly min?: number;
	readonly max?: number;
}

/**
 * Affichage conditionnel : le champ n'apparait que si `fieldKey` vaut `value`.
 * Openforms ne propose qu'une condition par champ, et une seule valeur.
 */
export interface OpenformsCondition {
	readonly fieldKey: string;
	readonly value: string;
}

/** Lignes et colonnes d'une grille d'evaluation. */
export interface OpenformsGrid {
	readonly rows: readonly string[];
	readonly columns: readonly string[];
}

/**
 * Un champ du formulaire distant.
 *
 * Reprend `FieldDefinition` d'Openforms (`backend/src/lib/formSchema.ts`) en ne
 * gardant que ce dont le rendu, l'envoi et l'analyse ont besoin. Les champs
 * inconnus du registre sont conserves tels quels : c'est la lecture qui decide
 * quoi en faire, pas l'analyse syntaxique.
 */
export interface OpenformsField {
	readonly key: string;
	readonly type: string;
	readonly label: string;
	readonly description?: string;
	readonly placeholder?: string;
	readonly required: boolean;
	readonly options: readonly OpenformsOption[];
	readonly allowOther?: boolean;
	readonly condition?: OpenformsCondition;
	readonly validation?: OpenformsValidation;
	readonly grid?: OpenformsGrid;
}

/** Le formulaire distant, tel que `GET /forms/public/:slug` le rend. */
export interface OpenformsForm {
	readonly id: string;
	readonly slug: string;
	readonly title: string;
	readonly description: string | null;
	readonly fields: readonly OpenformsField[];
	readonly requireConsent: boolean;
	readonly consentText: string | null;
	readonly privacyPolicyUrl: string | null;
}

/**
 * Une saisie, avant mise en forme pour l'envoi.
 *
 * Un tableau porte les choix multiples ; un enregistrement porte une grille,
 * une ligne par cle. Tout le reste est une chaine : le formulaire HTML n'en
 * produit pas d'autres, et convertir au plus tard evite d'avoir deux
 * representations du meme vide.
 */
export type FieldValue = string | readonly string[] | Readonly<Record<string, string>>;

export interface FieldTypeDefinition {
	/** Valeur de `type` chez Openforms. Contrat : jamais renommee. */
	readonly key: string;
	readonly label: string;

	/**
	 * Le champ porte-t-il une reponse ?
	 *
	 * Faux pour un titre de section ou un bloc de texte : ils s'affichent, mais
	 * il n'y a rien a valider, rien a envoyer, rien a compter.
	 */
	readonly carriesAnswer: boolean;

	/**
	 * Le champ collecte-t-il une donnee directement identifiante ?
	 *
	 * L'association recueille des opinions politiques, donnee sensible au sens
	 * de l'article 9 du RGPD : un courriel a cote suffirait a reidentifier le
	 * repondant (AGENTS.md section 4). Un tel champ n'est jamais propose sur
	 * `humanitour.fr`, et s'il est obligatoire chez Openforms, le questionnaire
	 * entier y est refuse plutot que soumis incomplet.
	 */
	readonly identifying: boolean;

	/**
	 * Type de question Humanitour qui recoit ce champ, ou `null` si aucun ne
	 * convient.
	 *
	 * `null` n'est pas un echec : une grille ou une date n'ont pas d'equivalent
	 * croisable aujourd'hui. Le champ reste affichable et soumissible, il n'entre
	 * simplement pas dans les resultats publies, et la fiche de liaison le dit.
	 */
	readonly questionType: string | null;

	/** Valeur de depart dans le formulaire. */
	blank(field: OpenformsField): FieldValue;

	/**
	 * Verifie une saisie. Retourne le motif de refus, ou `null` si elle passe.
	 *
	 * Openforms revalide tout a la soumission et fait autorite : ce controle
	 * n'existe que pour montrer l'erreur a cote du champ plutot qu'en bloc apres
	 * un aller-retour.
	 */
	validate(field: OpenformsField, value: FieldValue): string | null;

	/** Met la saisie sous la forme attendue par `POST /responses/submit`. */
	toSubmission(field: OpenformsField, value: FieldValue): unknown;

	/**
	 * Relit la saisie depuis les donnees d'un formulaire HTML envoye.
	 *
	 * C'est ce qui rend le questionnaire utilisable SANS JavaScript : la page
	 * est un `<form method="POST">` ordinaire, et le serveur reconstitue les
	 * valeurs a partir des `name` des controles.
	 *
	 * Couplage assume : les `name` poses par le widget
	 * (`src/lib/components/openforms/fields/`) doivent correspondre a ce que
	 * cette fonction lit. Les deux vivent a cote de leur type respectif, et
	 * `widgets.test.ts` garantit qu'aucun type n'a l'un sans l'autre.
	 */
	readForm(field: OpenformsField, form: FormData): FieldValue;

	/**
	 * Aplatit une valeur renvoyee par Openforms en cellule normalisable par le
	 * type de question. Un choix multiple devient une liste separee par des
	 * points-virgules, convention deja retenue par la normalisation.
	 */
	toCell(value: unknown): unknown;
}

/** Vrai si la valeur ne porte aucune saisie, quelle que soit sa forme. */
export function isEmptyValue(value: FieldValue): boolean {
	if (typeof value === 'string') return value.trim() === '';
	if (Array.isArray(value)) return value.length === 0;
	return Object.values(value as Record<string, string>).every((entry) => entry.trim() === '');
}

/** Lit une saisie en chaine, quelle que soit la forme recue. */
export function asText(value: FieldValue): string {
	if (typeof value === 'string') return value;
	if (Array.isArray(value)) return value.join('; ');
	return Object.values(value as Record<string, string>).join('; ');
}

/** Lit une saisie en liste, quelle que soit la forme recue. */
export function asList(value: FieldValue): readonly string[] {
	if (Array.isArray(value)) return value;
	if (typeof value === 'string') return value.trim() === '' ? [] : [value];
	return Object.values(value as Record<string, string>).filter((entry) => entry.trim() !== '');
}

/**
 * Lit un controle unique nomme par la cle du champ. Implementation partagee par
 * tous les types qui n'en posent qu'un.
 */
export function readSingle(field: OpenformsField, form: FormData): FieldValue {
	const raw = form.get(field.key);
	return typeof raw === 'string' ? raw : '';
}

/**
 * Lit une grille, dont chaque ligne est un controle nomme « cle:ligne ».
 * Partagee par les deux types de grille, qui ne different que par le nombre de
 * valeurs acceptees par ligne.
 */
export function readGridRows(field: OpenformsField, form: FormData, multiple: boolean): FieldValue {
	const rows = field.grid?.rows ?? [];

	return Object.fromEntries(
		rows.map((row) => {
			const name = `${field.key}:${row}`;
			if (!multiple) {
				const raw = form.get(name);
				return [row, typeof raw === 'string' ? raw : ''];
			}
			const chosen = form.getAll(name).filter((entry): entry is string => typeof entry === 'string');
			return [row, chosen.join('; ')];
		})
	);
}

/**
 * Aplatit une valeur distante en cellule. Implementation partagee par la
 * plupart des types : seuls ceux qui ont une forme propre la redefinissent.
 */
export function flattenCell(value: unknown): unknown {
	if (Array.isArray(value)) return value.map((entry) => String(entry)).join('; ');
	if (value && typeof value === 'object') return JSON.stringify(value);
	return value;
}

/**
 * Applique les bornes declarees au builder Openforms a une saisie textuelle.
 * Mutualisee parce que quatre types de champ la partagent : une divergence
 * entre eux ferait refuser une saisie ici et l'accepter la.
 */
export function checkTextBounds(field: OpenformsField, text: string): string | null {
	const rules = field.validation;
	if (!rules) return null;

	if (rules.minLength !== undefined && text.length < rules.minLength) {
		return `Au moins ${rules.minLength} caractères sont attendus.`;
	}
	if (rules.maxLength !== undefined && text.length > rules.maxLength) {
		return `${rules.maxLength} caractères au maximum.`;
	}
	if (rules.pattern && !matchesPattern(rules.pattern, text)) {
		return "Le format attendu n'est pas respecté.";
	}

	return null;
}

/**
 * Compile et applique une expression reguliere venue d'Openforms.
 *
 * L'expression est saisie par un operateur dans un autre logiciel : elle peut
 * etre invalide. Une expression qui ne compile pas ne REFUSE pas la saisie —
 * elle ne verifie rien. Refuser reviendrait a bloquer un repondant pour une
 * faute de configuration qu'il ne peut pas corriger, et Openforms tranchera de
 * toute facon a la soumission.
 */
function matchesPattern(pattern: string, text: string): boolean {
	try {
		return new RegExp(pattern).test(text);
	} catch {
		return true;
	}
}
