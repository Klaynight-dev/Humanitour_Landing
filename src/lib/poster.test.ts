import { describe, expect, it } from 'vitest';
import { footerLines, posterLayout, POSTER_WIDTH, wrapLines, type PosterContent } from './poster';

/** Mesure simulee : dix pixels par signe, pour raisonner en nombre de signes. */
const measure = (text: string) => text.length * 10;

const CONTENT: PosterContent = {
	surveyTitle: 'Présidentielle 2027',
	question: 'Quel sujet vous tient le plus à cœur ?',
	crossedWith: null,
	base: 'base : 842 répondants',
	fieldwork: 'Terrain du 15 juin 2026 au 20 août 2026',
	licence: 'ODbL 1.0',
	url: 'https://humanitour.fr/donnees/presidentielle-2027?x=priorite',
	chart: { dataUrl: 'data:image/png;base64,xxx', width: 760, height: 380 }
};

describe('wrapLines', () => {
	it('tient sur une ligne quand la largeur suffit', () => {
		expect(wrapLines('Trois petits mots', 1000, measure)).toEqual(['Trois petits mots']);
	});

	it('coupe aux espaces, jamais au milieu d un mot', () => {
		const lines = wrapLines('un deux trois quatre', 100, measure);

		expect(lines.join(' ')).toBe('un deux trois quatre');
		expect(lines.every((line) => !line.startsWith(' '))).toBe(true);
	});

	it('laisse un mot trop long occuper sa propre ligne', () => {
		// Le libelle d une question ne se tronque pas : il fait partie du
		// resultat, et une question amputee se lirait comme une autre question.
		const lines = wrapLines('court anticonstitutionnellement', 100, measure);

		expect(lines).toContain('anticonstitutionnellement');
	});

	it('rend une liste vide sur un texte vide', () => {
		expect(wrapLines('   ', 100, measure)).toEqual([]);
	});
});

describe('posterLayout', () => {
	it('garde les proportions du graphique', () => {
		const layout = posterLayout(1, 3, { width: 760, height: 380 });

		// Etirer le graphique fausserait la lecture des longueurs de barres.
		const sourceRatio = 380 / 760;
		const drawnRatio = layout.chart.height / layout.chart.width;
		expect(drawnRatio).toBeCloseTo(sourceRatio, 2);
	});

	it('grandit avec le titre et avec le pied de page', () => {
		const court = posterLayout(1, 2, { width: 760, height: 380 });
		const long = posterLayout(3, 4, { width: 760, height: 380 });

		expect(long.height).toBeGreaterThan(court.height);
		expect(long.headerHeight).toBeGreaterThan(court.headerHeight);
	});

	it('laisse le graphique dans ses marges', () => {
		const layout = posterLayout(2, 3, { width: 760, height: 380 });

		expect(layout.chart.x).toBeGreaterThan(0);
		expect(layout.chart.x + layout.chart.width).toBeLessThanOrEqual(POSTER_WIDTH);
		expect(layout.chart.y).toBeGreaterThanOrEqual(layout.headerHeight);
	});

	it('pose le pied de page sous le graphique', () => {
		const layout = posterLayout(1, 3, { width: 760, height: 380 });

		expect(layout.footerY).toBeGreaterThanOrEqual(layout.chart.y + layout.chart.height);
		expect(layout.footerY).toBeLessThan(layout.height);
	});
});

describe('footerLines', () => {
	it('emporte la base, le terrain, la licence et l adresse', () => {
		const lines = footerLines(CONTENT).join(' | ');

		expect(lines).toContain('842 répondants');
		expect(lines).toContain('2026');
		expect(lines).toContain('ODbL 1.0');
		expect(lines).toContain('humanitour.fr');
	});

	it('dit toujours que les effectifs sont bruts', () => {
		// C est la phrase que l image doit emporter partout ou elle circule.
		expect(footerLines(CONTENT).join(' ')).toContain('sans pondération ni redressement');
	});

	it('n ecrit pas de ligne vide quand le terrain est inconnu', () => {
		const lines = footerLines({ ...CONTENT, fieldwork: '', base: '' });

		expect(lines.every((line) => line.trim() !== '')).toBe(true);
	});
});
