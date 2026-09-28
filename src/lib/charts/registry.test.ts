import { describe, expect, it } from 'vitest';
import { chartsForSelection, getChart, resolveChart, wantsTimeline } from './index';

function keysOf(selection: { crossed: boolean; split: boolean }): string[] {
	return chartsForSelection(selection).map((chart) => chart.key);
}

describe('chartsForSelection', () => {
	it('propose l evolution avec les repartitions pour une question seule', () => {
		expect(keysOf({ crossed: false, split: false })).toEqual(['bars', 'donut', 'timeline']);
	});

	it('ne propose plus l evolution des qu un second axe s ajoute', () => {
		expect(keysOf({ crossed: true, split: false })).not.toContain('timeline');
	});

	it('ne propose plus l evolution en petits multiples', () => {
		expect(keysOf({ crossed: false, split: true })).toEqual(['bars', 'donut']);
	});

	it('propose les croisements quand deux questions sont croisees', () => {
		expect(keysOf({ crossed: true, split: false })).toEqual([
			'stacked',
			'grouped',
			'heatmap',
			'crosstab'
		]);
	});
});

describe('wantsTimeline', () => {
	const seule = { crossed: false, split: false };

	it('lit une evolution quand elle est demandee sur une question seule', () => {
		expect(wantsTimeline('timeline', seule)).toBe(true);
	});

	it('refuse l evolution sur un croisement, plutot que d ignorer l axe demande', () => {
		expect(wantsTimeline('timeline', { crossed: true, split: false })).toBe(false);
	});

	it('refuse l evolution en petits multiples', () => {
		expect(wantsTimeline('timeline', { crossed: false, split: true })).toBe(false);
	});

	it('ne confond pas une autre visualisation avec l evolution', () => {
		expect(wantsTimeline('bars', seule)).toBe(false);
	});

	it('ignore une cle inconnue, comme le reste du permalien', () => {
		expect(wantsTimeline('inexistante', seule)).toBe(false);
	});
});

describe('entree « timeline » du registre', () => {
	it('est une forme a part, pas une variante de la repartition', () => {
		expect(getChart('timeline')?.shape).toBe('timeline');
	});

	it('est accompagnee d un tableau, comme tout graphique en couleur', () => {
		expect(getChart('timeline')?.tabular).toBe(false);
	});

	it('retombe sur un croisement si un lien demande l evolution avec un second axe', () => {
		// La page resout la forme en `crosstab` quand un second axe est present :
		// le lien partage survit, avec la premiere visualisation compatible.
		expect(resolveChart('timeline', 'crosstab').key).toBe('stacked');
	});
});
