import { describe, expect, it } from 'vitest';
import { isForbiddenCrossSiteForm } from './csrf';

const url = new URL('https://humanitour.fr/infolettre');

function post(headers: Record<string, string>, method = 'POST'): Request {
	return new Request(url, {
		method,
		headers,
		body: method === 'GET' ? undefined : new Uint8Array([120])
	});
}

describe('isForbiddenCrossSiteForm', () => {
	it('refuse un formulaire poste depuis un autre site', () => {
		expect(
			isForbiddenCrossSiteForm(
				post({
					'content-type': 'application/x-www-form-urlencoded',
					origin: 'https://evil.example'
				}),
				url
			)
		).toBe(true);
	});

	it('refuse un formulaire sans en-tete Origin', () => {
		expect(
			isForbiddenCrossSiteForm(post({ 'content-type': 'multipart/form-data; boundary=x' }), url)
		).toBe(true);
	});

	it('accepte un formulaire du site lui-meme', () => {
		expect(
			isForbiddenCrossSiteForm(
				post({ 'content-type': 'text/plain', origin: 'https://humanitour.fr' }),
				url
			)
		).toBe(false);
	});

	it('laisse passer le JSON et les lectures, comme SvelteKit', () => {
		expect(isForbiddenCrossSiteForm(post({ 'content-type': 'application/json' }), url)).toBe(false);
		expect(isForbiddenCrossSiteForm(new Request(url), url)).toBe(false);
		expect(isForbiddenCrossSiteForm(post({}), url)).toBe(false);
	});

	it('exempte la seule desinscription en un clic', () => {
		const oneClick = new URL(
			'https://humanitour.fr/infolettre/desinscription/un-clic?adresse=a&cle=b'
		);
		const request = new Request(oneClick, {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: 'List-Unsubscribe=One-Click'
		});
		expect(isForbiddenCrossSiteForm(request, oneClick)).toBe(false);

		const neighbour = new URL('https://humanitour.fr/infolettre/desinscription');
		expect(isForbiddenCrossSiteForm(new Request(neighbour, request), neighbour)).toBe(true);
	});
});
