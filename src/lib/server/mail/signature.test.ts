import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifySignature } from './signature';

const key = Buffer.from('cle-de-test-pour-le-webhook-resend');
const secret = `whsec_${key.toString('base64')}`;
const now = 1_790_000_000_000;
const timestamp = String(now / 1000);
const body = '{"type":"email.received","data":{"email_id":"abc"}}';

function sign(id: string, ts: string, payload: string): string {
	return createHmac('sha256', key).update(`${id}.${ts}.${payload}`).digest('base64');
}

describe('verifySignature', () => {
	const request = { secret, id: 'msg_1', timestamp, body, now };

	it('accepte une signature valide', () => {
		expect(
			verifySignature({ ...request, signature: `v1,${sign('msg_1', timestamp, body)}` })
		).toEqual({ ok: true });
	});

	it('accepte une signature valide parmi plusieurs', () => {
		const signature = `v1,AAAA v2,zzz v1,${sign('msg_1', timestamp, body)}`;
		expect(verifySignature({ ...request, signature })).toEqual({ ok: true });
	});

	it('refuse un corps modifie', () => {
		const signature = `v1,${sign('msg_1', timestamp, body)}`;
		expect(verifySignature({ ...request, body: body.replace('abc', 'abd'), signature })).toEqual({
			ok: false,
			reason: 'mismatch'
		});
	});

	it('refuse une version de signature inconnue', () => {
		expect(
			verifySignature({ ...request, signature: `v2,${sign('msg_1', timestamp, body)}` }).ok
		).toBe(false);
	});

	it('refuse un horodatage trop ancien, meme bien signe', () => {
		const old = String(now / 1000 - 600);
		expect(
			verifySignature({ ...request, timestamp: old, signature: `v1,${sign('msg_1', old, body)}` })
		).toEqual({
			ok: false,
			reason: 'stale'
		});
	});

	it('refuse un horodatage illisible', () => {
		expect(verifySignature({ ...request, timestamp: 'demain', signature: 'v1,x' }).ok).toBe(false);
	});

	it('refuse une requete sans en-tetes', () => {
		expect(verifySignature({ ...request, signature: null })).toEqual({
			ok: false,
			reason: 'missing-headers'
		});
	});

	it('refuse un secret vide', () => {
		expect(verifySignature({ ...request, secret: 'whsec_', signature: 'v1,x' })).toEqual({
			ok: false,
			reason: 'bad-secret'
		});
	});

	it('utilise l horloge du serveur par defaut', () => {
		const current = String(Math.floor(Date.now() / 1000));
		const signature = `v1,${sign('msg_2', current, body)}`;
		expect(verifySignature({ secret, id: 'msg_2', timestamp: current, body, signature })).toEqual({
			ok: true
		});
	});
});
