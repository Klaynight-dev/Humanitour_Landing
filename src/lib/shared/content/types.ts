import { parseDeclaredFields, type ContentDataResult, type ContentField } from './fields';

/**
 * Contrat du registre des sections de contenu.
 *
 * Ajouter une section au site = ajouter un fichier qui exporte un
 * `ContentBlockType`, l'enregistrer dans `index.ts`, et lui donner son
 * composant dans `src/lib/components/content/registry.ts`. Les champs propres
 * au type vivent dans la colonne `data`, validee ici : aucune colonne ne
 * s'ajoute en base (AGENTS.md § 2).
 *
 * Une section est un morceau de page reel, pas un gabarit generique : la
 * couverture de l'accueil, le tableau des ecarts, la ligne de portraits. Les
 * variantes de mise en page sont des champs `choice` du type lui-meme, ce qui
 * evite d'avoir dix types qui ne different que par une couleur de fond.
 */

export type ContentPageKey =
	| 'HOME'
	| 'ABOUT'
	| 'TOUR'
	| 'METHOD'
	| 'GALLERY'
	| 'DATA'
	| 'MEDIA'
	| 'ANSWER';

/**
 * Familles de la bibliotheque de sections.
 *
 * Elles ne servent qu'a ranger le catalogue au back-office : dix-sept sections
 * dans une liste deroulante unique ne se choisissent pas, elles se subissent.
 */
export type ContentBlockGroup = 'couverture' | 'texte' | 'listes' | 'medias' | 'site' | 'action';

export const CONTENT_BLOCK_GROUPS: readonly {
	readonly key: ContentBlockGroup;
	readonly label: string;
}[] = [
	{ key: 'couverture', label: 'Couvertures' },
	{ key: 'texte', label: 'Textes' },
	{ key: 'listes', label: 'Listes et chiffres' },
	{ key: 'medias', label: 'Images et cartes' },
	{ key: 'site', label: 'Contenus du site' },
	{ key: 'action', label: 'Appels à l’action' }
];

export interface ContentBlockType {
	/** Valeur stockee dans `ContentBlock.type`. Contrat : jamais renommee. */
	readonly key: string;
	readonly label: string;
	readonly description: string;
	readonly group: ContentBlockGroup;
	readonly fields: readonly ContentField[];

	/**
	 * Contenu pose a l'ajout de la section.
	 *
	 * Une section ajoutee arrive remplie d'un exemple juste, pas vide : une page
	 * ne doit jamais passer par un etat casse entre l'ajout et la saisie, et on
	 * corrige un texte plus facilement qu'on n'en invente un devant un champ
	 * blanc. C'est aussi ce qui rend « ajouter » reversible sans danger.
	 */
	readonly starter: Readonly<Record<string, unknown>>;

	/** Valide et normalise le contenu de la colonne `data`. */
	parseData(raw: unknown): ContentDataResult;
}

/** Un bloc tel que le consomment les pages publiques. */
export interface ContentBlockRecord {
	readonly id: string;
	readonly type: string;
	readonly position: number;
	readonly data: Readonly<Record<string, unknown>>;
}

interface BlockDefinition {
	readonly key: string;
	readonly label: string;
	readonly description: string;
	readonly group: ContentBlockGroup;
	readonly fields: readonly ContentField[];
	readonly starter: Readonly<Record<string, unknown>>;
	/**
	 * Regle editoriale propre au type, verifiee apres les champs.
	 *
	 * Rend un motif de refus, ou `null`. Sert aux contraintes qu'un champ ne
	 * peut pas porter seul : un tableau dont les lignes n'ont pas le meme
	 * nombre de cellules que l'en-tete, par exemple.
	 */
	check?(data: Record<string, unknown>): string | null;
}

/**
 * Fabrique un type de section a partir de sa declaration.
 *
 * Aucun fichier de section ne reimplemente « obligatoire », « une image a une
 * description » ou « cette variante existe » : la validation descend des
 * champs declares. Un fichier de section ne contient donc que ce qui lui est
 * propre, et se relit en une minute.
 */
export function defineBlockType(definition: BlockDefinition): ContentBlockType {
	return {
		key: definition.key,
		label: definition.label,
		description: definition.description,
		group: definition.group,
		fields: definition.fields,
		starter: definition.starter,

		parseData(raw) {
			const result = parseDeclaredFields(definition.fields, raw);
			if (!result.ok) return result;

			const reason = definition.check?.(result.data) ?? null;
			return reason === null ? result : { ok: false, reason };
		}
	};
}

export * from './fields';
