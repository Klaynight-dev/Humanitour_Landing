import { describe, expect, it } from 'vitest';
import { rank, score, type SearchHit } from './rank';

function hit(title: string, updatedAt: string, kind: SearchHit['kind'] = 'survey'): SearchHit {
	return {
		kind,
		id: `${kind}-${title}`,
		title,
		subtitle: '',
		href: `/admin/${kind}`,
		updatedAt: new Date(updatedAt)
	};
}

describe('score', () => {
	it('classe le titre exact devant le prefixe, et le prefixe devant l inclusion', () => {
		const exact = score(hit('Présidentielle', '2026-01-01'), 'Présidentielle');
		const prefix = score(hit('Présidentielle 2027', '2026-01-01'), 'Présidentielle');
		const inside = score(hit('Sondage présidentielle', '2026-01-01'), 'Présidentielle');

		expect(exact).toBeGreaterThan(prefix);
		expect(prefix).toBeGreaterThan(inside);
		expect(inside).toBeGreaterThan(0);
	});

	it('ignore la casse', () => {
		expect(score(hit('PRÉSIDENTIELLE', '2026-01-01'), 'présidentielle')).toBe(3);
	});

	it('rend zero quand la requete est vide ou absente du titre', () => {
		expect(score(hit('Présidentielle', '2026-01-01'), '   ')).toBe(0);
		expect(score(hit('Présidentielle', '2026-01-01'), 'médiathèque')).toBe(0);
	});
});

describe('rank', () => {
	it('trie par pertinence avant la date', () => {
		const hits = [
			hit('Sondage présidentielle', '2026-06-01'),
			hit('Présidentielle 2027', '2026-01-01')
		];

		expect(rank(hits, 'Présidentielle', 10).map((row) => row.title)).toEqual([
			'Présidentielle 2027',
			'Sondage présidentielle'
		]);
	});

	it('departage deux resultats de meme pertinence par la date la plus recente', () => {
		const hits = [hit('Tour A', '2026-01-01'), hit('Tour B', '2026-06-01')];

		expect(rank(hits, 'Tour', 10).map((row) => row.title)).toEqual(['Tour B', 'Tour A']);
	});

	it('departage par le titre quand la pertinence et la date sont identiques', () => {
		const hits = [hit('Tour B', '2026-01-01'), hit('Tour A', '2026-01-01')];

		expect(rank(hits, 'Tour', 10).map((row) => row.title)).toEqual(['Tour A', 'Tour B']);
	});

	it('melange les domaines dans une seule liste', () => {
		const hits = [
			hit('Équipe', '2026-01-01', 'user'),
			hit('Équipe du tour', '2026-06-01', 'media')
		];

		expect(rank(hits, 'Équipe', 10).map((row) => row.kind)).toEqual(['user', 'media']);
	});

	it('tronque a la limite demandee', () => {
		const hits = [hit('Tour A', '2026-01-01'), hit('Tour B', '2026-06-01')];

		expect(rank(hits, 'Tour', 1)).toHaveLength(1);
	});

	it('ne modifie pas le tableau recu', () => {
		const hits = [hit('Tour A', '2026-01-01'), hit('Tour B', '2026-06-01')];
		rank(hits, 'Tour', 10);

		expect(hits.map((row) => row.title)).toEqual(['Tour A', 'Tour B']);
	});
});
