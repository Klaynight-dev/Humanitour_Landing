import { describe, expect, it } from 'vitest';
import { isPermanentFailure, parseWebhookEvent } from './webhook-event';

describe('parseWebhookEvent', () => {
	it('lit un rebond tel que documente par Resend', () => {
		const event = parseWebhookEvent({
			type: 'email.bounced',
			created_at: '2026-11-22T23:41:12.126Z',
			data: {
				email_id: '56761188-7520-42d8-8898-ff6fc54ce618',
				to: ['delivered@resend.dev'],
				bounce: { message: 'Adresse inconnue.', subType: 'Suppressed', type: 'Permanent' },
				tags: { category: 'confirm_email' }
			}
		});

		expect(event).toEqual({
			type: 'email.bounced',
			emailId: '56761188-7520-42d8-8898-ff6fc54ce618',
			to: ['delivered@resend.dev'],
			bounceType: 'Permanent',
			detail: 'Adresse inconnue.',
			tags: { category: 'confirm_email' }
		});
	});

	it('lit les etiquettes envoyees sous forme de tableau', () => {
		const event = parseWebhookEvent({
			type: 'email.delivered',
			data: { email_id: 'x', tags: [{ name: 'kind', value: 'campaign' }, { name: 3 }, 'bruit'] }
		});
		expect(event?.tags).toEqual({ kind: 'campaign' });
	});

	it('lit le motif d un echec', () => {
		expect(
			parseWebhookEvent({ type: 'email.failed', data: { failed: { reason: 'Quota atteint.' } } })
				?.detail
		).toBe('Quota atteint.');
		expect(
			parseWebhookEvent({ type: 'email.failed', data: { error: { message: 'Refusé.' } } })?.detail
		).toBe('Refusé.');
	});

	it('tolere une charge incomplete', () => {
		expect(parseWebhookEvent({ type: 'email.received', data: { to: 'x', tags: null } })).toEqual({
			type: 'email.received',
			emailId: null,
			to: [],
			bounceType: null,
			detail: null,
			tags: {}
		});
	});

	it('refuse une charge sans type', () => {
		expect(parseWebhookEvent(null)).toBeNull();
		expect(parseWebhookEvent([])).toBeNull();
		expect(parseWebhookEvent({ data: {} })).toBeNull();
	});
});

describe('isPermanentFailure', () => {
	const base = { emailId: 'x', to: [], detail: null, tags: {} };

	it('retient le rebond definitif et la suppression', () => {
		expect(isPermanentFailure({ ...base, type: 'email.bounced', bounceType: 'Permanent' })).toBe(
			true
		);
		expect(isPermanentFailure({ ...base, type: 'email.suppressed', bounceType: null })).toBe(true);
	});

	it('ecarte le rebond passager et les autres evenements', () => {
		expect(isPermanentFailure({ ...base, type: 'email.bounced', bounceType: 'Transient' })).toBe(
			false
		);
		expect(isPermanentFailure({ ...base, type: 'email.bounced', bounceType: null })).toBe(false);
		expect(isPermanentFailure({ ...base, type: 'email.delivered', bounceType: 'Permanent' })).toBe(
			false
		);
	});
});
