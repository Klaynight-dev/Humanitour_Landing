import { describe, expect, it } from 'vitest';
import { batchKey, testSubject } from './batches';

describe('batchKey', () => {
	it('depend du premier, du dernier et du nombre d envois', () => {
		expect(batchKey('c1', ['a', 'b', 'c'])).toBe('campagne-c1-a-c-3');
		expect(batchKey('c1', ['a', 'b', 'c'])).not.toBe(batchKey('c1', ['a', 'c']));
	});

	it('reste definie pour un lot vide', () => {
		expect(batchKey('c1', [])).toBe('campagne-c1-vide-vide-0');
	});
});

describe('testSubject', () => {
	it('signale l essai dans l objet', () => {
		expect(testSubject('Les résultats')).toBe('[Essai] Les résultats');
	});
});
