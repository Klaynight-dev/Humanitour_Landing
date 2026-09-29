import { describe, expect, it, vi } from 'vitest';
import { BATCH_SIZE, createResendClient, ResendError, type OutgoingEmail } from './resend';

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

const email: OutgoingEmail = {
	from: 'Humanitour <contact@humanitour.fr>',
	to: ['alice@exemple.fr'],
	subject: 'Bonjour',
	html: '<p>Bonjour</p>',
	text: 'Bonjour'
};

describe('createResendClient', () => {
	it('envoie un courriel avec le jeton et la cle d idempotence', async () => {
		const fetch = vi.fn(async () => jsonResponse({ id: 'em_1' }));
		const client = createResendClient({ token: 're_test', fetch });

		const result = await client.send(
			{
				...email,
				cc: ['b@exemple.fr'],
				bcc: ['c@exemple.fr'],
				replyTo: ['d@exemple.fr'],
				headers: { 'In-Reply-To': '<x@y>' },
				tags: { kind: 'mailbox' },
				attachments: [
					{ filename: 'a.pdf', content: 'QUJD', contentType: 'application/pdf' },
					{ filename: 'b.txt', content: 'eA==' }
				]
			},
			'cle-1'
		);

		expect(result).toEqual({ id: 'em_1' });
		const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('https://api.resend.com/emails');
		expect(init.method).toBe('POST');
		expect(init.headers).toMatchObject({
			Authorization: 'Bearer re_test',
			'Idempotency-Key': 'cle-1'
		});
		const body = JSON.parse(String(init.body));
		expect(body).toMatchObject({
			cc: ['b@exemple.fr'],
			bcc: ['c@exemple.fr'],
			reply_to: ['d@exemple.fr'],
			headers: { 'In-Reply-To': '<x@y>' },
			tags: [{ name: 'kind', value: 'mailbox' }],
			attachments: [
				{ filename: 'a.pdf', content: 'QUJD', content_type: 'application/pdf' },
				{ filename: 'b.txt', content: 'eA==' }
			]
		});
	});

	it('n envoie pas les champs facultatifs vides', async () => {
		const fetch = vi.fn(async () => jsonResponse({ id: 'em_2' }));
		await createResendClient({ token: 't', fetch }).send({ ...email, cc: [], headers: {} });
		const body = JSON.parse(
			String((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body)
		);
		expect(Object.keys(body).sort()).toEqual(['from', 'html', 'subject', 'text', 'to']);
	});

	it('transforme une erreur de Resend en ResendError lisible', async () => {
		const fetch = vi.fn(async () =>
			jsonResponse({ name: 'validation_error', message: 'Domaine non vérifié.' }, 403)
		);
		const error = await createResendClient({ token: 't', fetch })
			.send(email)
			.catch((caught: unknown) => caught);
		expect(error).toBeInstanceOf(ResendError);
		expect(error).toMatchObject({
			message: 'Domaine non vérifié.',
			status: 403,
			code: 'validation_error'
		});
	});

	it('donne un message generique quand Resend ne repond pas en JSON', async () => {
		const fetch = vi.fn(async () => new Response('panne', { status: 502 }));
		await expect(createResendClient({ token: 't', fetch }).send(email)).rejects.toMatchObject({
			message: 'Resend a répondu 502.',
			code: null
		});
	});

	it('envoie un lot et rend les identifiants dans l ordre', async () => {
		const fetch = vi.fn(async () => jsonResponse({ data: [{ id: 'a' }, { id: 'b' }] }));
		const result = await createResendClient({ token: 't', fetch }).sendBatch(
			[email, email],
			'lot-1'
		);
		expect(result).toEqual({ ids: ['a', 'b'] });
		expect((fetch.mock.calls[0] as unknown as [string])[0]).toBe(
			'https://api.resend.com/emails/batch'
		);
	});

	it('refuse un lot trop grand sans appeler Resend', async () => {
		const fetch = vi.fn();
		const batch = Array.from({ length: BATCH_SIZE + 1 }, () => email);
		await expect(createResendClient({ token: 't', fetch }).sendBatch(batch)).rejects.toBeInstanceOf(
			ResendError
		);
		expect(fetch).not.toHaveBeenCalled();
	});

	it('tolere une reponse de lot sans donnees', async () => {
		const fetch = vi.fn(async () => jsonResponse({}));
		expect(await createResendClient({ token: 't', fetch }).sendBatch([email])).toEqual({ ids: [] });
	});

	it('lit un courriel recu et normalise ses champs', async () => {
		const fetch = vi.fn(async () =>
			jsonResponse({
				id: 'rcv_1',
				from: 'Bob <bob@exemple.fr>',
				to: ['contact@humanitour.fr'],
				cc: null,
				reply_to: ['bob.perso@exemple.fr'],
				received_for: ['contact@humanitour.fr'],
				subject: 'Question',
				html: '<p>Hé</p>',
				text: 'Hé',
				headers: { 'In-Reply-To': '<a@b>', References: ['<x@y>', '<a@b>'], Ignored: 3 },
				message_id: '<m@exemple.fr>',
				created_at: '2026-09-29T10:00:00Z',
				authentication: { spf: 'pass', dkim: 'pass', dmarc: 'fail' }
			})
		);

		const received = await createResendClient({ token: 't', fetch }).getReceivedEmail('rcv_1');
		expect(received).toMatchObject({
			id: 'rcv_1',
			cc: [],
			replyTo: ['bob.perso@exemple.fr'],
			headers: { 'in-reply-to': '<a@b>', references: '<x@y> <a@b>' },
			messageId: '<m@exemple.fr>',
			authentication: { dmarc: 'fail' }
		});
		expect((fetch.mock.calls[0] as unknown as [string])[0]).toBe(
			'https://api.resend.com/emails/receiving/rcv_1'
		);
	});

	it('remplit les champs absents d un courriel recu', async () => {
		const fetch = vi.fn(async () => jsonResponse({ id: 'r', headers: null, authentication: 'x' }));
		const received = await createResendClient({ token: 't', fetch }).getReceivedEmail('r');
		expect(received).toMatchObject({
			subject: '',
			html: null,
			text: null,
			headers: {},
			authentication: {},
			messageId: null
		});
		expect(typeof received.createdAt).toBe('string');
	});

	it('liste les pieces jointes d un courriel recu', async () => {
		const fetch = vi.fn(async () =>
			jsonResponse({
				data: [
					{
						id: 'att_1',
						filename: 'plan.pdf',
						content_type: 'application/pdf',
						content_disposition: 'attachment',
						content_id: null,
						size: 1200,
						download_url: 'https://cdn/att_1'
					},
					{ id: 'att_2' }
				]
			})
		);
		const attachments = await createResendClient({ token: 't', fetch }).listReceivedAttachments(
			'rcv_1'
		);
		expect(attachments[0]).toEqual({
			id: 'att_1',
			filename: 'plan.pdf',
			contentType: 'application/pdf',
			contentDisposition: 'attachment',
			contentId: null,
			size: 1200,
			downloadUrl: 'https://cdn/att_1'
		});
		expect(attachments[1]).toMatchObject({ filename: null, size: null, downloadUrl: null });
	});

	it('rend une liste vide si Resend ne rend pas de tableau', async () => {
		const fetch = vi.fn(async () => jsonResponse({ data: null }));
		expect(await createResendClient({ token: 't', fetch }).listReceivedAttachments('r')).toEqual(
			[]
		);
	});

	it('telecharge une piece jointe sans lui envoyer le jeton', async () => {
		const fetch = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
		const bytes = await createResendClient({ token: 't', fetch }).download('https://cdn/att_1');
		expect([...bytes]).toEqual([1, 2, 3]);
		expect(fetch.mock.calls[0]).toEqual(['https://cdn/att_1']);
	});

	it('signale un telechargement en echec', async () => {
		const fetch = vi.fn(async () => new Response('', { status: 410 }));
		await expect(
			createResendClient({ token: 't', fetch }).download('https://cdn/x')
		).rejects.toMatchObject({ status: 410 });
	});
});
