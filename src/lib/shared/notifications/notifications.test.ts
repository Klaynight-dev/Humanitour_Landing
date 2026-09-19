import { describe, expect, it } from 'vitest';
import { getNotificationType, NOTIFICATION_TYPES } from './index';
import { text } from './types';
import { isPermission } from '$lib/shared/permissions';

describe('registre des notifications', () => {
	it('expose chaque type sous une cle unique', () => {
		const keys = NOTIFICATION_TYPES.map((type) => type.key);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('rattache chaque type a une permission qui existe vraiment', () => {
		// Une permission inventee rendrait la notification invisible pour tout le
		// monde, en silence : c'est exactement le genre de panne qu'on ne voit pas.
		for (const type of NOTIFICATION_TYPES) {
			expect(isPermission(type.requiredPermission)).toBe(true);
		}
	});

	it('rend un titre, une description et une destination pour chaque type', () => {
		for (const type of NOTIFICATION_TYPES) {
			const view = type.render({});
			expect(view.title.length).toBeGreaterThan(0);
			expect(view.description.length).toBeGreaterThan(0);
			expect(view.href.startsWith('/')).toBe(true);
		}
	});

	it('reste lisible quand les donnees sont incompletes', () => {
		const published = getNotificationType('survey.published');
		expect(published?.render({}).description).toContain('Une enquête');
	});

	it('utilise les donnees quand elles sont la', () => {
		const published = getNotificationType('survey.published');
		const view = published?.render({ title: 'Présidentielle 2027', surveyId: 'abc' });
		expect(view?.description).toContain('Présidentielle 2027');
		expect(view?.href).toBe('/admin/sondages/abc');
	});

	it('rend null pour une cle inconnue', () => {
		expect(getNotificationType('nexiste-pas')).toBeNull();
	});
});

describe('text', () => {
	it('rend le repli quand la valeur est absente, vide ou non textuelle', () => {
		expect(text({}, 'a', 'repli')).toBe('repli');
		expect(text({ a: '   ' }, 'a', 'repli')).toBe('repli');
		expect(text({ a: 12 }, 'a', 'repli')).toBe('repli');
	});

	it('rend la valeur quand elle est utilisable', () => {
		expect(text({ a: 'bonjour' }, 'a', 'repli')).toBe('bonjour');
	});
});
