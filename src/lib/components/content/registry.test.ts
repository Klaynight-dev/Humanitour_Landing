import { describe, expect, it } from 'vitest';
import { CONTENT_BLOCK_TYPES } from '$lib/shared/content';
import { RENDERED_BLOCK_KEYS, sectionComponent } from './registry';

/**
 * Le registre des sections et celui de leur rendu doivent se repondre.
 *
 * Ils vivent dans deux dossiers — la declaration est isomorphe et testee, le
 * rendu est un composant Svelte — et c'est ce qui rend la separation sure.
 * Sans ce test, ajouter un type de section sans son composant donnerait un
 * bloc qu'on peut creer au back-office, remplir, publier… et qui ne s'affiche
 * nulle part. C'est le meme filet que `components/openforms/fields/`.
 */
describe('registre de rendu', () => {
	it('donne un composant a chaque type de section declare', () => {
		for (const type of CONTENT_BLOCK_TYPES) {
			expect(sectionComponent(type.key), `section « ${type.key} » sans composant`).not.toBeNull();
		}
	});

	it('ne rend aucun type absent du registre declare', () => {
		const declared = new Set(CONTENT_BLOCK_TYPES.map((type) => type.key));
		for (const key of RENDERED_BLOCK_KEYS) {
			expect(declared.has(key), `composant orphelin pour « ${key} »`).toBe(true);
		}
	});

	it('ignore une cle inconnue plutot que de lever', () => {
		expect(sectionComponent('nexiste-pas')).toBeNull();
	});
});
