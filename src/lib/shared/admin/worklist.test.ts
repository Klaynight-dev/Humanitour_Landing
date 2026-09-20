import { describe, expect, it } from 'vitest';
import {
	buildWorklist,
	changeRatio,
	EMPTY_COUNTS,
	WORK_KEYS,
	type WorkCounts
} from './worklist';
import { PERMISSION_KEYS } from '$lib/shared/permissions';

/** Un compte qui detient tout, pour isoler ce qu'on teste du filtre de permission. */
const root = { permissions: PERMISSION_KEYS as string[] };

function counts(overrides: Partial<WorkCounts>): WorkCounts {
	return { ...EMPTY_COUNTS, ...overrides };
}

describe('buildWorklist', () => {
	it('ne retient pas ce qui vaut zero', () => {
		expect(buildWorklist(EMPTY_COUNTS, root)).toEqual([]);
	});

	it('accorde le libelle au nombre', () => {
		const [single] = buildWorklist(counts({ 'survey-draft': 1 }), root);
		expect(single?.label).toBe('1 sondage en brouillon');

		const [plural] = buildWorklist(counts({ 'survey-draft': 4 }), root);
		expect(plural?.label).toBe('4 sondages en brouillon');
	});

	it('fait passer ce qui est casse devant ce qui attend', () => {
		const items = buildWorklist(counts({ 'survey-draft': 9, 'sync-failed': 1 }), root);
		expect(items.map((item) => item.key)).toEqual(['sync-failed', 'survey-draft']);
	});

	it('classe le plus nombreux en premier a gravite egale', () => {
		const items = buildWorklist(counts({ 'survey-draft': 2, 'media-draft': 7 }), root);
		expect(items.map((item) => item.key)).toEqual(['media-draft', 'survey-draft']);
	});

	it('tait ce que le compte ne peut pas ouvrir', () => {
		const redaction = { permissions: ['media.read'] };
		const items = buildWorklist(counts({ 'survey-draft': 3, 'media-draft': 1 }), redaction);
		expect(items.map((item) => item.key)).toEqual(['media-draft']);
	});

	it('ne rend rien sans compte', () => {
		expect(buildWorklist(counts({ 'sync-failed': 5 }), null)).toEqual([]);
	});

	it('mene chaque tache vers un ecran du back-office', () => {
		const full = counts(Object.fromEntries(WORK_KEYS.map((key) => [key, 1])) as WorkCounts);
		const items = buildWorklist(full, root);

		expect(items).toHaveLength(WORK_KEYS.length);
		for (const item of items) expect(item.href.startsWith('/admin/')).toBe(true);
	});

	it('demande une permission connue du registre pour chaque tache', () => {
		// Une permission mal orthographiee ici rendrait la tache invisible pour
		// tout le monde, sans erreur : le filtre repondrait simplement faux.
		const full = counts(Object.fromEntries(WORK_KEYS.map((key) => [key, 1])) as WorkCounts);
		expect(buildWorklist(full, root)).toHaveLength(WORK_KEYS.length);
	});
});

describe('changeRatio', () => {
	it('mesure une hausse et une baisse', () => {
		expect(changeRatio(120, 100)).toBe(20);
		expect(changeRatio(80, 100)).toBe(-20);
	});

	it('rend zero quand rien ne bouge', () => {
		expect(changeRatio(100, 100)).toBe(0);
	});

	it("refuse de comparer a une periode vide plutot que d'inventer un pourcentage", () => {
		expect(changeRatio(42, 0)).toBeNull();
		expect(changeRatio(0, 0)).toBeNull();
	});
});
