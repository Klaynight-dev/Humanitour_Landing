import { describe, expect, it } from 'vitest';
import {
	advanceStatus,
	counterChanges,
	isProblem,
	MAIL_STATUSES,
	STATUS_LABELS,
	statusForEvent
} from './status';

describe('statusForEvent', () => {
	it('traduit les evenements d envoi', () => {
		expect(statusForEvent('email.delivered')).toBe('DELIVERED');
		expect(statusForEvent('email.suppressed')).toBe('BOUNCED');
		expect(statusForEvent('email.delivery_delayed')).toBe('DELAYED');
	});

	it('ignore les evenements sans etat', () => {
		expect(statusForEvent('email.received')).toBeNull();
		expect(statusForEvent('email.opened')).toBeNull();
	});
});

describe('advanceStatus', () => {
	it('fait avancer un envoi', () => {
		expect(advanceStatus('QUEUED', 'SENT')).toBe('SENT');
		expect(advanceStatus('SENT', 'DELIVERED')).toBe('DELIVERED');
		expect(advanceStatus('DELAYED', 'DELIVERED')).toBe('DELIVERED');
	});

	it('ne fait pas reculer un courriel remis sur un evenement en retard', () => {
		expect(advanceStatus('DELIVERED', 'SENT')).toBeNull();
		expect(advanceStatus('DELIVERED', 'DELAYED')).toBeNull();
	});

	it('laisse un rebond tardif l emporter sur la remise', () => {
		expect(advanceStatus('DELIVERED', 'BOUNCED')).toBe('BOUNCED');
	});

	it('met la plainte au-dessus de tout', () => {
		expect(advanceStatus('DELIVERED', 'COMPLAINED')).toBe('COMPLAINED');
		expect(advanceStatus('COMPLAINED', 'BOUNCED')).toBeNull();
	});

	it('ne change rien a un courriel recu, ni a un etat identique', () => {
		expect(advanceStatus('RECEIVED', 'DELIVERED')).toBeNull();
		expect(advanceStatus('SENT', 'SENT')).toBeNull();
	});
});

describe('counterChanges', () => {
	it('compte une remise', () => {
		expect(counterChanges('SENT', 'DELIVERED')).toEqual({
			increment: 'deliveredCount',
			decrement: null
		});
	});

	it('retire des remis un courriel rejete apres coup', () => {
		expect(counterChanges('DELIVERED', 'BOUNCED')).toEqual({
			increment: 'bouncedCount',
			decrement: 'deliveredCount'
		});
		expect(counterChanges('DELIVERED', 'FAILED')).toEqual({
			increment: 'failedCount',
			decrement: 'deliveredCount'
		});
	});

	it('garde remis un courriel signale', () => {
		expect(counterChanges('DELIVERED', 'COMPLAINED')).toEqual({
			increment: 'complainedCount',
			decrement: null
		});
	});

	it('ne compte ni l envoi ni le retard', () => {
		expect(counterChanges('QUEUED', 'SENT')).toEqual({ increment: null, decrement: null });
		expect(counterChanges('SENT', 'DELAYED')).toEqual({ increment: null, decrement: null });
	});
});

describe('libelles', () => {
	it('nomme chaque etat', () => {
		for (const status of MAIL_STATUSES) expect(STATUS_LABELS[status]).not.toBe('');
	});

	it('signale les etats qui demandent l attention', () => {
		expect(MAIL_STATUSES.filter(isProblem)).toEqual(['DELAYED', 'BOUNCED', 'COMPLAINED', 'FAILED']);
	});
});
