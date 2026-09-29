/**
 * Markdown des courriels : un sous-ensemble ferme, rendu en HTML de courriel et
 * en texte brut.
 *
 * Pas de bibliotheque : un moteur Markdown complet accepte le HTML brut, et un
 * courriel redige au back-office part ensuite chez des centaines de personnes.
 * Ici, tout caractere est echappe AVANT d'etre interprete, et seules les formes
 * listees plus bas produisent une balise. Un compte compromis ne peut donc
 * glisser ni script, ni formulaire, ni pixel espion dans une campagne : il ne
 * peut ecrire que ce que ce fichier sait rendre. C'est la meme regle que
 * `RichText.svelte` sur le site public.
 *
 * Les styles sont en ligne parce que la plupart des messageries ignorent une
 * feuille de style `<style>` ou n'en gardent qu'une partie.
 *
 * Syntaxe reconnue :
 *
 *   # Titre, ## Sous-titre, ### Intertitre
 *   **gras**, *italique* ou _italique_, `code`
 *   [texte](https://adresse) et les adresses nues https://...
 *   - liste a puces, 1. liste numerotee
 *   > citation
 *   ---                         filet de separation
 *   ![legende](https://image)   image seule sur sa ligne
 *   -> [Texte](https://...)     bouton d'appel a l'action
 */

export interface MarkdownOptions {
	/**
	 * Origine prefixee aux liens relatifs (`/donnees`). Sans elle, un lien
	 * relatif est rendu en texte : dans une messagerie, il ne menerait nulle part.
	 */
	readonly origin?: string;
}

const COLORS = {
	ink: '#000000',
	link: '#C1201F',
	muted: '#3D3D3D',
	rule: '#E6D9D2',
	wash: '#FFF1EB'
} as const;

const STYLES = {
	p: `margin:0 0 16px;font-size:16px;line-height:1.6;color:${COLORS.ink};`,
	h1: `margin:0 0 16px;font-size:26px;line-height:1.25;font-weight:700;color:${COLORS.ink};`,
	h2: `margin:24px 0 12px;font-size:21px;line-height:1.3;font-weight:700;color:${COLORS.ink};`,
	h3: `margin:20px 0 8px;font-size:17px;line-height:1.35;font-weight:700;color:${COLORS.ink};`,
	list: `margin:0 0 16px;padding-left:22px;font-size:16px;line-height:1.6;color:${COLORS.ink};`,
	li: 'margin:0 0 6px;',
	quote: `margin:0 0 16px;padding:4px 0 4px 16px;border-left:3px solid ${COLORS.link};color:${COLORS.muted};font-size:16px;line-height:1.6;`,
	hr: `border:0;border-top:1px solid ${COLORS.rule};margin:24px 0;`,
	img: 'display:block;max-width:100%;height:auto;border:0;margin:0 0 16px;border-radius:12px;',
	a: `color:${COLORS.link};text-decoration:underline;`,
	code: `font-family:Menlo,Consolas,monospace;font-size:14px;background:${COLORS.wash};padding:1px 4px;border-radius:4px;`,
	button: `display:inline-block;background:${COLORS.ink};color:#FFFFFF;text-decoration:none;font-weight:700;font-size:16px;line-height:1;padding:14px 22px;border-radius:999px;`
} as const;

/** Echappement HTML complet, guillemets compris : le texte finit aussi dans des attributs. */
export function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/**
 * Une adresse de lien acceptable, ou `null`.
 *
 * Liste blanche de schemas : `javascript:`, `data:` et consorts ne passent pas,
 * quelle que soit leur casse ou leur encodage, parce qu'on ne cherche pas a les
 * reconnaitre, on ne reconnait que ce qui est permis.
 */
export function safeUrl(raw: string, origin?: string): string | null {
	const url = raw.trim();
	if (/^https?:\/\/[^\s]+$/i.test(url)) return url;
	if (/^mailto:[^\s@]+@[^\s@]+$/i.test(url)) return url;
	if (url.startsWith('/') && !url.startsWith('//') && origin)
		return `${origin.replace(/\/$/, '')}${url}`;
	return null;
}

/** Une image n'accepte que HTTPS : une image en clair trahit la lecture sur le reseau. */
function safeImageUrl(raw: string): string | null {
	const url = raw.trim();
	return /^https:\/\/[^\s]+$/i.test(url) ? url : null;
}

const INLINE =
	/\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*|\b_([^_]+)_\b|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s<]*[^\s<.,;:!?)])/g;

type InlineMode = 'html' | 'text';

/**
 * Rendu d'une ligne : emphase, code et liens.
 *
 * Le texte entre deux motifs est echappe tel quel ; le contenu d'un motif est
 * rendu recursivement, sauf le code, qui reste litteral, et l'interieur d'un
 * lien, qui ne peut pas contenir d'autre lien.
 */
function renderInline(
	source: string,
	mode: InlineMode,
	options: MarkdownOptions,
	inLink = false
): string {
	let output = '';
	let cursor = 0;

	for (const match of source.matchAll(INLINE)) {
		const index = match.index;
		output +=
			mode === 'html' ? escapeHtml(source.slice(cursor, index)) : source.slice(cursor, index);
		output += renderToken(match, mode, options, inLink);
		cursor = index + match[0].length;
	}

	const rest = source.slice(cursor);
	return output + (mode === 'html' ? escapeHtml(rest) : rest);
}

function renderToken(
	match: RegExpMatchArray,
	mode: InlineMode,
	options: MarkdownOptions,
	inLink: boolean
): string {
	const [whole, bold, star, underscore, code, label, href, bare] = match;

	if (bold !== undefined) return wrap('strong', renderInline(bold, mode, options, inLink), mode);
	if (star !== undefined) return wrap('em', renderInline(star, mode, options, inLink), mode);
	if (underscore !== undefined)
		return wrap('em', renderInline(underscore, mode, options, inLink), mode);
	if (code !== undefined) {
		return mode === 'html' ? `<code style="${STYLES.code}">${escapeHtml(code)}</code>` : code;
	}

	if (label !== undefined && href !== undefined)
		return renderLink(label, href, mode, options, inLink);

	if (bare !== undefined && !inLink) {
		return mode === 'html'
			? `<a href="${escapeHtml(bare)}" style="${STYLES.a}">${escapeHtml(bare)}</a>`
			: bare;
	}

	return mode === 'html' ? escapeHtml(whole) : whole;
}

/** `[texte](adresse)` : un lien refuse, ou imbrique dans un autre, se reduit a son texte. */
function renderLink(
	label: string,
	href: string,
	mode: InlineMode,
	options: MarkdownOptions,
	inLink: boolean
): string {
	const text = renderInline(label, mode, options, true);
	const url = inLink ? null : safeUrl(href, options.origin);
	if (url === null) return text;
	return mode === 'html'
		? `<a href="${escapeHtml(url)}" style="${STYLES.a}">${text}</a>`
		: `${label} (${url})`;
}

function wrap(tag: 'strong' | 'em', inner: string, mode: InlineMode): string {
	return mode === 'html' ? `<${tag}>${inner}</${tag}>` : inner;
}

/** Les blocs reconnus, une fois les lignes regroupees. */
export type MarkdownBlock =
	| { readonly type: 'heading'; readonly level: 1 | 2 | 3; readonly text: string }
	| { readonly type: 'paragraph'; readonly lines: readonly string[] }
	| { readonly type: 'bullets'; readonly items: readonly string[] }
	| { readonly type: 'numbers'; readonly items: readonly string[] }
	| { readonly type: 'quote'; readonly lines: readonly string[] }
	| { readonly type: 'rule' }
	| { readonly type: 'image'; readonly alt: string; readonly src: string }
	| { readonly type: 'button'; readonly label: string; readonly href: string };

const HEADING = /^(#{1,3})\s+(.+)$/;
const BULLET = /^[-*]\s+(.+)$/;
const NUMBER = /^\d{1,3}[.)]\s+(.+)$/;
const QUOTE = /^>\s?(.*)$/;
const RULE = /^(-{3,}|\*{3,}|_{3,})$/;
const IMAGE = /^!\[([^\]]*)\]\(([^)\s]+)\)$/;
const BUTTON = /^->\s*\[([^\]]+)\]\(([^)\s]+)\)$/;

/** Le type de liste d'une ligne, ou `null` si elle n'en commence pas une. */
function listItem(line: string): { type: 'bullets' | 'numbers'; text: string } | null {
	const bullet = BULLET.exec(line);
	if (bullet?.[1] !== undefined) return { type: 'bullets', text: bullet[1] };
	const number = NUMBER.exec(line);
	if (number?.[1] !== undefined) return { type: 'numbers', text: number[1] };
	return null;
}

/** Une ligne qui forme un bloc a elle seule, ou `null`. */
function singleLineBlock(line: string): MarkdownBlock | null {
	if (RULE.test(line)) return { type: 'rule' };

	const heading = HEADING.exec(line);
	if (heading?.[1] !== undefined && heading[2] !== undefined) {
		return { type: 'heading', level: heading[1].length as 1 | 2 | 3, text: heading[2].trim() };
	}

	const image = IMAGE.exec(line);
	if (image?.[1] !== undefined && image[2] !== undefined)
		return { type: 'image', alt: image[1], src: image[2] };

	const button = BUTTON.exec(line);
	if (button?.[1] !== undefined && button[2] !== undefined)
		return { type: 'button', label: button[1], href: button[2] };

	return null;
}

/**
 * Decoupe le texte en blocs.
 *
 * Une ligne vide ferme le bloc courant ; une ligne d'un autre genre aussi. Deux
 * lignes consecutives d'un paragraphe restent un paragraphe, avec un retour a
 * la ligne entre elles, parce qu'une signature ou une adresse s'ecrit ainsi.
 */
export function parseMarkdown(source: string): MarkdownBlock[] {
	const blocks: MarkdownBlock[] = [];
	let current: { type: 'paragraph' | 'quote' | 'bullets' | 'numbers'; lines: string[] } | null =
		null;

	const flush = () => {
		if (current === null) return;
		if (current.type === 'paragraph' || current.type === 'quote') {
			blocks.push({ type: current.type, lines: current.lines });
		} else {
			blocks.push({ type: current.type, items: current.lines });
		}
		current = null;
	};

	const push = (type: 'paragraph' | 'quote' | 'bullets' | 'numbers', text: string) => {
		if (current?.type !== type) {
			flush();
			current = { type, lines: [] };
		}
		current.lines.push(text);
	};

	for (const raw of source.replace(/\r\n?/g, '\n').split('\n')) {
		const line = raw.trim();

		if (line === '') {
			flush();
			continue;
		}

		const single = singleLineBlock(line);
		if (single !== null) {
			flush();
			blocks.push(single);
			continue;
		}

		const quote = QUOTE.exec(line);
		if (quote?.[1] !== undefined) {
			push('quote', quote[1]);
			continue;
		}

		const item = listItem(line);
		if (item !== null) {
			push(item.type, item.text);
			continue;
		}

		push('paragraph', line);
	}

	flush();
	return blocks;
}

function blockToHtml(block: MarkdownBlock, options: MarkdownOptions): string {
	const inline = (text: string) => renderInline(text, 'html', options);

	switch (block.type) {
		case 'heading':
			return `<h${block.level} style="${STYLES[`h${block.level}`]}">${inline(block.text)}</h${block.level}>`;
		case 'paragraph':
			return `<p style="${STYLES.p}">${block.lines.map(inline).join('<br>')}</p>`;
		case 'quote':
			return `<blockquote style="${STYLES.quote}">${block.lines.map(inline).join('<br>')}</blockquote>`;
		case 'bullets':
		case 'numbers': {
			const tag = block.type === 'bullets' ? 'ul' : 'ol';
			const items = block.items
				.map((item) => `<li style="${STYLES.li}">${inline(item)}</li>`)
				.join('');
			return `<${tag} style="${STYLES.list}">${items}</${tag}>`;
		}
		case 'rule':
			return `<hr style="${STYLES.hr}">`;
		case 'image': {
			const src = safeImageUrl(block.src);
			if (src === null) return '';
			return `<img src="${escapeHtml(src)}" alt="${escapeHtml(block.alt)}" width="536" style="${STYLES.img}">`;
		}
		case 'button': {
			const href = safeUrl(block.href, options.origin);
			if (href === null) return `<p style="${STYLES.p}">${escapeHtml(block.label)}</p>`;
			return `<p style="margin:8px 0 24px;"><a href="${escapeHtml(href)}" style="${STYLES.button}">${escapeHtml(block.label)}</a></p>`;
		}
	}
}

function blockToText(block: MarkdownBlock, options: MarkdownOptions): string {
	const inline = (text: string) => renderInline(text, 'text', options);

	switch (block.type) {
		case 'heading':
			return inline(block.text);
		case 'paragraph':
			return block.lines.map(inline).join('\n');
		case 'quote':
			return block.lines.map((line) => `> ${inline(line)}`).join('\n');
		case 'bullets':
			return block.items.map((item) => `- ${inline(item)}`).join('\n');
		case 'numbers':
			return block.items.map((item, index) => `${index + 1}. ${inline(item)}`).join('\n');
		case 'rule':
			return '---';
		case 'image':
			return block.alt === '' ? '' : `[${block.alt}]`;
		case 'button': {
			const href = safeUrl(block.href, options.origin);
			return href === null ? block.label : `${block.label} : ${href}`;
		}
	}
}

/** Le corps HTML d'un courriel, sans enveloppe. */
export function markdownToHtml(source: string, options: MarkdownOptions = {}): string {
	return parseMarkdown(source)
		.map((block) => blockToHtml(block, options))
		.filter((html) => html !== '')
		.join('\n');
}

/** La version texte : toute messagerie la lit, et les filtres anti-spam s'en servent. */
export function markdownToText(source: string, options: MarkdownOptions = {}): string {
	return parseMarkdown(source)
		.map((block) => blockToText(block, options))
		.filter((text) => text !== '')
		.join('\n\n');
}
