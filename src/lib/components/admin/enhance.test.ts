import { describe, expect, it, vi } from 'vitest';
import { closeAfter } from './enhance';

describe('closeAfter', () => {
	it('referme la fenetre une fois le resultat applique', async () => {
		const order: string[] = [];
		const update = vi.fn(async () => {
			order.push('update');
		});

		const submit = closeAfter(() => order.push('close'));
		const callback = await submit({} as never);
		await callback?.({ update } as never);

		// L'ordre est la regle : refermer avant la mise a jour montrerait
		// l'ancienne liste pendant l'aller-retour.
		expect(order).toEqual(['update', 'close']);
	});
});
