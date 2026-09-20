import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { imageDimensions } from './dimensions';

/**
 * Les dimensions sont relevees sur de vrais fichiers du depot.
 *
 * Des octets fabriques a la main verifieraient que la fonction lit ce qu'on a
 * ecrit, pas qu'elle lit ce qu'un appareil photo produit. Les cliches du tour
 * sont la, avec leurs dimensions notees dans `shared/photos.ts` : ce test
 * verifie donc aussi que ce tableau dit vrai.
 */
describe('dimensions d une image', () => {
	it('lit un JPEG en sautant sa vignette', async () => {
		const bytes = new Uint8Array(await readFile('static/photos/IMG_2316.JPG'));
		expect(imageDimensions(bytes)).toEqual({ width: 2048, height: 1536 });
	});

	it('lit un PNG', async () => {
		const bytes = new Uint8Array(await readFile('static/logo-badge.png'));
		const size = imageDimensions(bytes);
		expect(size).not.toBeNull();
		expect(size!.width).toBeGreaterThan(0);
		expect(size!.height).toBeGreaterThan(0);
	});

	it('rend null sur ce qui n est pas une image, sans lever', () => {
		expect(imageDimensions(new Uint8Array([1, 2, 3]))).toBeNull();
		expect(imageDimensions(new Uint8Array(0))).toBeNull();
	});

	it('rend null sur un en-tete tronque plutot que de lever', () => {
		// Signature JPEG, puis rien : le fichier a ete coupe en cours de transfert.
		expect(imageDimensions(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]))).toBeNull();
	});
});
