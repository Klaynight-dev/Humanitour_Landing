import { describe, expect, it } from 'vitest';
import { CONTENT_PAGES } from '../index';
import { CONTENT_TEMPLATES, getContentTemplate, prepareTemplate } from './index';

/**
 * Le filet de securite des modeles.
 *
 * Un modele est du contenu ecrit a la main : un nom de champ mal orthographie,
 * une variante qui n'existe plus, une image sans description y passeraient
 * inapercus jusqu'a l'installation — c'est-a-dire jusqu'au moment ou l'on
 * compte justement sur lui pour reparer une page. Ces tests refusent la
 * livraison avant.
 */

describe('modeles de page', () => {
	it('couvre chaque page editable', () => {
		for (const page of CONTENT_PAGES) {
			expect(getContentTemplate(page.key), `modèle manquant pour ${page.key}`).not.toBeNull();
		}
	});

	it('ne decrit aucune page absente du registre', () => {
		const known = new Set(CONTENT_PAGES.map((page) => page.key));
		for (const template of CONTENT_TEMPLATES) {
			expect(known.has(template.key)).toBe(true);
		}
	});

	it('passe la validation du back-office, section par section', () => {
		for (const template of CONTENT_TEMPLATES) {
			const result = prepareTemplate(template);
			// Le motif complet est affiche en cas d'echec : il nomme la page, le rang
			// de la section et le champ fautif.
			expect(result.ok ? null : result.reason).toBeNull();
		}
	});

	it('commence chaque page par une couverture', () => {
		for (const template of CONTENT_TEMPLATES) {
			expect(template.blocks[0]?.type, `page ${template.key}`).toBe('cover');
		}
	});

	it('normalise les donnees avant la base', () => {
		const home = prepareTemplate(getContentTemplate('HOME')!);
		expect(home.ok).toBe(true);
		if (!home.ok) return;

		const cover = home.blocks[0]!;
		// Le texte enrichi est stocke comme document structure, jamais comme
		// chaine : c'est ce qui interdit a une balise d'atteindre la page.
		const split = home.blocks.find((block) => block.type === 'split')!;
		expect(typeof split.data.body).toBe('object');
		expect(cover.data.image).toMatchObject({ alt: expect.any(String) });
	});
});
