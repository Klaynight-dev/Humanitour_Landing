import { describe, expect, it } from 'vitest';
import { escapeHtml, markdownToHtml, markdownToText, parseMarkdown, safeUrl } from './markdown';

describe('escapeHtml', () => {
	it('echappe les cinq caracteres dangereux', () => {
		expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
			'&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;'
		);
	});
});

describe('safeUrl', () => {
	it('accepte http, https et mailto', () => {
		expect(safeUrl('https://humanitour.fr')).toBe('https://humanitour.fr');
		expect(safeUrl('http://exemple.fr/a')).toBe('http://exemple.fr/a');
		expect(safeUrl('mailto:contact@humanitour.fr')).toBe('mailto:contact@humanitour.fr');
	});

	it('refuse tout autre schema, quelle que soit la casse', () => {
		expect(safeUrl('javascript:alert(1)')).toBeNull();
		expect(safeUrl('JaVaScRiPt:alert(1)')).toBeNull();
		expect(safeUrl('data:text/html,<b>x</b>')).toBeNull();
	});

	it('complete un chemin relatif avec l origine, et seulement si elle est donnee', () => {
		expect(safeUrl('/donnees', 'https://humanitour.fr/')).toBe('https://humanitour.fr/donnees');
		expect(safeUrl('/donnees')).toBeNull();
	});

	it('refuse une adresse relative au protocole', () => {
		expect(safeUrl('//evil.example', 'https://humanitour.fr')).toBeNull();
	});
});

describe('parseMarkdown', () => {
	it('reconnait chaque forme de bloc', () => {
		const blocks = parseMarkdown(
			[
				'# Titre',
				'## Sous-titre',
				'### Intertitre',
				'Un paragraphe',
				'sur deux lignes',
				'',
				'- un',
				'* deux',
				'1. premier',
				'2) second',
				'> cite',
				'---',
				'![Photo](https://humanitour.fr/a.jpg)',
				'-> [Soutenir](https://humanitour.fr/soutenir)'
			].join('\n')
		);

		expect(blocks.map((block) => block.type)).toEqual([
			'heading',
			'heading',
			'heading',
			'paragraph',
			'bullets',
			'numbers',
			'quote',
			'rule',
			'image',
			'button'
		]);
		expect(blocks[3]).toEqual({ type: 'paragraph', lines: ['Un paragraphe', 'sur deux lignes'] });
		expect(blocks[4]).toEqual({ type: 'bullets', items: ['un', 'deux'] });
	});

	it('accepte les fins de ligne Windows', () => {
		expect(parseMarkdown('a\r\n\r\nb')).toHaveLength(2);
	});

	it('rend une liste vide pour un texte vide', () => {
		expect(parseMarkdown('  \n\n ')).toEqual([]);
	});
});

describe('markdownToHtml', () => {
	it('echappe le HTML ecrit dans le texte au lieu de l interpreter', () => {
		const html = markdownToHtml('<script>alert(1)</script> <img src=x onerror=y>');
		expect(html).not.toContain('<script');
		expect(html).not.toContain('<img');
		expect(html).toContain('&lt;script&gt;');
	});

	it('rend gras, italique et code', () => {
		const html = markdownToHtml('**gras** *pench* _aussi_ `a<b`');
		expect(html).toContain('<strong>gras</strong>');
		expect(html).toContain('<em>pench</em>');
		expect(html).toContain('<em>aussi</em>');
		expect(html).toMatch(/<code[^>]*>a&lt;b<\/code>/);
	});

	it('ne prend pas un tiret bas au milieu d un mot pour de l italique', () => {
		expect(markdownToHtml('snake_case_name')).not.toContain('<em>');
	});

	it('ne prend pas une multiplication pour de l italique', () => {
		expect(markdownToHtml('2 * 3 * 4')).not.toContain('<em>');
	});

	it('rend un lien permis et reduit un lien interdit a son texte', () => {
		expect(markdownToHtml('[site](https://humanitour.fr)')).toMatch(
			/<a href="https:\/\/humanitour\.fr"[^>]*>site<\/a>/
		);
		const blocked = markdownToHtml('[clic](javascript:alert(1))');
		expect(blocked).not.toContain('<a');
		expect(blocked).toContain('clic');
	});

	it('rend une adresse nue cliquable sans avaler la ponctuation finale', () => {
		const html = markdownToHtml('Voir https://humanitour.fr/donnees.');
		expect(html).toContain('href="https://humanitour.fr/donnees"');
		expect(html).toContain('</a>.');
	});

	it('n imbrique pas de lien dans un lien', () => {
		const html = markdownToHtml('[voir https://a.fr](https://b.fr)');
		expect(html.match(/<a /g)).toHaveLength(1);
	});

	it('complete les liens relatifs avec l origine', () => {
		expect(markdownToHtml('[données](/donnees)', { origin: 'https://humanitour.fr' })).toContain(
			'href="https://humanitour.fr/donnees"'
		);
	});

	it('rend les listes, la citation, le filet et les titres', () => {
		const html = markdownToHtml('# T\n\n- a\n- b\n\n1. c\n\n> q\n\n---');
		expect(html).toMatch(/<h1[^>]*>T<\/h1>/);
		expect(html).toMatch(/<ul[^>]*><li[^>]*>a<\/li><li[^>]*>b<\/li><\/ul>/);
		expect(html).toMatch(/<ol[^>]*><li[^>]*>c<\/li><\/ol>/);
		expect(html).toMatch(/<blockquote[^>]*>q<\/blockquote>/);
		expect(html).toContain('<hr');
	});

	it('n affiche une image qu en HTTPS', () => {
		expect(markdownToHtml('![Vélo](https://humanitour.fr/v.jpg)')).toContain(
			'<img src="https://humanitour.fr/v.jpg" alt="Vélo"'
		);
		expect(markdownToHtml('![Espion](http://tracker.example/p.gif)')).toBe('');
	});

	it('rend un bouton, ou son texte seul si le lien est interdit', () => {
		expect(markdownToHtml('-> [Soutenir](https://humanitour.fr/soutenir)')).toMatch(
			/<a href="https:\/\/humanitour\.fr\/soutenir"[^>]*>Soutenir<\/a>/
		);
		expect(markdownToHtml('-> [Piège](javascript:x)')).toMatch(/<p[^>]*>Piège<\/p>/);
	});
});

describe('markdownToText', () => {
	it('garde le texte et ecrit les liens en clair', () => {
		const text = markdownToText(
			'# Titre\n\n**Bonjour** [le site](https://humanitour.fr)\n\n- a\n\n1. b\n2. c\n\n> cite\n\n---\n\n![Photo](https://x.fr/a.jpg)\n\n![](https://x.fr/b.jpg)\n\n-> [Soutenir](https://humanitour.fr/s)\n\n-> [Rien](javascript:x)\n\n`code`'
		);
		expect(text).toBe(
			[
				'Titre',
				'Bonjour le site (https://humanitour.fr)',
				'- a',
				'1. b\n2. c',
				'> cite',
				'---',
				'[Photo]',
				'Soutenir : https://humanitour.fr/s',
				'Rien',
				'code'
			].join('\n\n')
		);
	});

	it('reduit un lien interdit a son texte', () => {
		expect(markdownToText('[clic](javascript:x) et https://a.fr')).toBe('clic et https://a.fr');
	});
});
