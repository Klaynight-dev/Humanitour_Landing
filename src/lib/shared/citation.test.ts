import { describe, expect, it } from 'vitest';
import { codeExamples, longCitation, shortCitation, type CitationContext } from './citation';

const CONTEXT: CitationContext = {
	surveyTitle: 'Présidentielle 2027',
	questionLabel: 'Quel sujet vous tient le plus à cœur ?',
	crossedWithLabel: null,
	base: 842,
	filters: [],
	fieldwork: 'Terrain du 1 juillet 2026 au 31 août 2026',
	pageUrl: 'https://humanitour.fr/donnees/presidentielle-2027?x=priorite',
	apiUrl: 'https://humanitour.fr/api/public/sondages/presidentielle-2027/resultat?x=priorite',
	consultedOn: new Date('2026-09-19T12:00:00Z')
};

describe('shortCitation', () => {
	it('porte la source, le titre, la base et la licence', () => {
		const citation = shortCitation(CONTEXT);

		expect(citation).toContain('Humanitour');
		expect(citation).toContain('Présidentielle 2027');
		expect(citation).toContain('n = 842');
		expect(citation).toContain('ODbL 1.0');
	});

	it('n invente pas de base quand le seuil interdit de la publier', () => {
		const citation = shortCitation({ ...CONTEXT, base: null });

		expect(citation).not.toContain('n =');
		expect(citation).toContain('Humanitour');
	});
});

describe('longCitation', () => {
	it('porte le libelle exact de la question', () => {
		// La formulation fait partie du resultat : une citation qui la perd laisse
		// croire qu on a pose une autre question.
		expect(longCitation(CONTEXT)).toContain('Quel sujet vous tient le plus à cœur ?');
	});

	it('annonce le croisement', () => {
		const citation = longCitation({ ...CONTEXT, crossedWithLabel: 'Votre région' });

		expect(citation).toContain('croisée avec « Votre région »');
	});

	it('annonce la restriction de population', () => {
		const citation = longCitation({ ...CONTEXT, filters: ['Votre région : Bretagne'] });

		expect(citation).toContain('population restreinte à : Votre région : Bretagne');
	});

	it('dit toujours que les effectifs sont bruts', () => {
		expect(longCitation(CONTEXT)).toContain('sans pondération ni redressement');
	});

	it('porte l adresse et la date de consultation', () => {
		const citation = longCitation(CONTEXT);

		expect(citation).toContain('https://humanitour.fr/donnees/presidentielle-2027?x=priorite');
		expect(citation).toContain('19 septembre 2026');
	});

	it('se termine par un point unique', () => {
		expect(longCitation(CONTEXT).endsWith('.')).toBe(true);
		expect(longCitation(CONTEXT)).not.toContain('..');
	});
});

describe('codeExamples', () => {
	it('propose Python, R et curl', () => {
		expect(codeExamples(CONTEXT.apiUrl).map((example) => example.key)).toEqual([
			'python',
			'r',
			'curl'
		]);
	});

	it('vise l adresse exacte du croisement affiche', () => {
		for (const example of codeExamples(CONTEXT.apiUrl)) {
			expect(example.code).toContain(CONTEXT.apiUrl);
		}
	});

	it('lit le resultat la ou l API le range vraiment', () => {
		// Si l API deplace ses cellules, ces exemples doivent casser ici plutot
		// que chez un chercheur qui les a copies.
		const [python] = codeExamples(CONTEXT.apiUrl);

		expect(python?.code).toContain('["resultat"]["cellules"]');
	});
});
