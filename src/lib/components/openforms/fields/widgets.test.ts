import { describe, expect, it } from 'vitest';
import { FIELD_TYPES } from '$lib/shared/openforms/fields';
import { FIELD_WIDGETS, getFieldWidget } from './index';

/**
 * Le garde-fou des deux registres.
 *
 * Le comportement d'un champ vit dans `shared/openforms/fields/`, son widget
 * ici. La separation est justifiee, mais elle ne tient que si personne ne peut
 * ajouter un type d'un cote en oubliant l'autre. C'est ce que verifient ces
 * tests, et c'est la seule raison pour laquelle deux registres valent mieux
 * qu'un.
 */
describe('parite des registres de champ', () => {
	it('donne un widget a tout type collectable', () => {
		const collectable = FIELD_TYPES.filter((type) => type.carriesAnswer || type.key === 'section' || type.key === 'text_block');

		for (const type of collectable) {
			expect(getFieldWidget(type.key), `aucun widget pour « ${type.key} »`).not.toBeNull();
		}
	});

	it('ne rend aucun champ identifiant', () => {
		// La regle du RGPD (AGENTS.md section 4) tient a cette absence : un widget
		// ajoute par megarde pour « email » afficherait le champ sur le site.
		for (const type of FIELD_TYPES.filter((entry) => entry.identifying)) {
			expect(getFieldWidget(type.key), `« ${type.key} » ne doit pas etre rendu`).toBeNull();
		}
	});

	it('ne declare aucun widget orphelin', () => {
		const known = new Set(FIELD_TYPES.map((type) => type.key));

		for (const widget of FIELD_WIDGETS) {
			expect(known.has(widget.key), `« ${widget.key} » n a pas de comportement declare`).toBe(true);
		}
	});

	it('expose des cles uniques', () => {
		const keys = FIELD_WIDGETS.map((widget) => widget.key);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('ne marque autonomes que les blocs de mise en page', () => {
		for (const widget of FIELD_WIDGETS.filter((entry) => entry.standalone)) {
			const type = FIELD_TYPES.find((entry) => entry.key === widget.key);
			expect(type?.carriesAnswer, `« ${widget.key} » porte une reponse`).toBe(false);
		}
	});
});
