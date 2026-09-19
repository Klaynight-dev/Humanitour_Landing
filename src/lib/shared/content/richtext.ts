import { z } from 'zod';

/**
 * Texte enrichi du back-office.
 *
 * Le contenu n'est JAMAIS stocke ni rendu comme du HTML. Il est stocke sous
 * forme d'un modele structure, et le rendu emet de vrais elements a partir de
 * ce modele. Une balise injectee n'a donc aucun chemin pour atteindre la page :
 * ce n'est pas un filtre qui l'en empeche, c'est la forme meme des donnees.
 *
 * C'est aussi ce qui permet de valider une soumission forgee a la main : elle
 * ne peut produire que des noeuds prevus ici, avec des liens dont le protocole
 * a ete verifie.
 */

/** Protocoles autorises pour un lien. `javascript:` et `data:` sont absents. */
const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:'];

/**
 * Un lien utilisable, ou `null`.
 *
 * Une adresse relative (`/donnees`, `#section`) est acceptee : c'est la facon
 * normale de renvoyer vers une autre page du site.
 */
export function safeHref(raw: string): string | null {
	const value = raw.trim();
	if (value === '') return null;
	if (value.startsWith('/') || value.startsWith('#')) return value;

	try {
		const url = new URL(value);
		return SAFE_PROTOCOLS.includes(url.protocol) ? url.href : null;
	} catch {
		return null;
	}
}

const markSchema = z.enum(['strong', 'em']);

const inlineSchema = z.object({
	text: z.string(),
	marks: z.array(markSchema).optional(),
	href: z.string().optional()
});

const blockSchema = z.object({
	type: z.enum(['paragraph', 'heading', 'bullet-list', 'ordered-list']),
	/** Les elements d'une liste ; pour les autres blocs, une seule entree. */
	items: z.array(z.array(inlineSchema))
});

const docSchema = z.object({
	blocks: z.array(blockSchema)
});

export type RichTextMark = z.infer<typeof markSchema>;
export type RichTextInline = z.infer<typeof inlineSchema>;
export type RichTextBlock = z.infer<typeof blockSchema>;
export type RichTextDoc = z.infer<typeof docSchema>;

export const EMPTY_DOC: RichTextDoc = { blocks: [] };

/** Retire les liens dont le protocole n'est pas sur, en gardant leur texte. */
function cleanInline(run: RichTextInline): RichTextInline | null {
	const text = run.text;
	if (text === '') return null;

	const href = run.href === undefined ? null : safeHref(run.href);

	return {
		text,
		// Un lien refuse ne fait pas disparaitre la phrase : seul le lien saute.
		...(href === null ? {} : { href }),
		...(run.marks && run.marks.length > 0 ? { marks: run.marks } : {})
	};
}

function cleanBlock(block: RichTextBlock): RichTextBlock | null {
	const items = block.items
		.map((item) => item.map(cleanInline).filter((run): run is RichTextInline => run !== null))
		.filter((item) => item.length > 0);

	return items.length === 0 ? null : { type: block.type, items };
}

/**
 * Lit un document soumis par le back-office.
 *
 * Accepte aussi bien le JSON produit par l'editeur que du texte brut : sans
 * JavaScript, le champ est un `textarea` ordinaire, et une saisie au clavier
 * doit rester publiable.
 */
export function parseRichText(raw: unknown): RichTextDoc {
	if (typeof raw === 'string') {
		const trimmed = raw.trim();
		if (trimmed === '') return EMPTY_DOC;

		// Le JSON de l'editeur arrive sous forme de chaine dans le formulaire.
		if (trimmed.startsWith('{')) {
			try {
				return parseRichText(JSON.parse(trimmed));
			} catch {
				// Ce n'etait pas du JSON : c'est du texte, et il se lit comme tel.
			}
		}

		return fromPlainText(trimmed);
	}

	const result = docSchema.safeParse(raw);
	if (!result.success) return EMPTY_DOC;

	const blocks = result.data.blocks
		.map(cleanBlock)
		.filter((block): block is RichTextBlock => block !== null);

	return { blocks };
}

/** Texte brut vers document : un paragraphe par ligne vide, comme a la saisie. */
export function fromPlainText(raw: string): RichTextDoc {
	const blocks = raw
		.split(/\n\s*\n/)
		.map((part) => part.trim())
		.filter((part) => part !== '')
		.map((part) => ({ type: 'paragraph' as const, items: [[{ text: part }]] }));

	return { blocks };
}

/**
 * Document vers texte brut.
 *
 * Sert au repli sans JavaScript et partout ou le contenu doit voyager sans mise
 * en forme : un chapo, une metadonnee Open Graph, un resume.
 */
export function toPlainText(doc: RichTextDoc): string {
	return doc.blocks
		.map((block) =>
			block.items.map((item) => item.map((run) => run.text).join('')).join('\n')
		)
		.join('\n\n');
}

export function isEmptyDoc(doc: RichTextDoc): boolean {
	return doc.blocks.length === 0;
}
