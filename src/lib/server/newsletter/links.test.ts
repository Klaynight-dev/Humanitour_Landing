import { describe, expect, it } from 'vitest';
import {
	listUnsubscribeHeaders,
	oneClickUrl,
	signAddress,
	unsubscribeUrl,
	verifyAddress
} from './links';

const key = Buffer.from('cle-de-test');
const other = Buffer.from('autre-cle');

describe('signature d adresse', () => {
	it('verifie la signature de la meme adresse avec la meme cle', () => {
		expect(verifyAddress(key, 'a@b.fr', signAddress(key, 'a@b.fr'))).toBe(true);
	});

	it('refuse la signature d une autre adresse ou d une autre cle', () => {
		expect(verifyAddress(key, 'c@b.fr', signAddress(key, 'a@b.fr'))).toBe(false);
		expect(verifyAddress(key, 'a@b.fr', signAddress(other, 'a@b.fr'))).toBe(false);
	});

	it('refuse une signature tronquee ou vide', () => {
		expect(verifyAddress(key, 'a@b.fr', signAddress(key, 'a@b.fr').slice(0, 10))).toBe(false);
		expect(verifyAddress(key, 'a@b.fr', '')).toBe(false);
	});

	it('tient dans une adresse sans encodage', () => {
		expect(signAddress(key, 'a@b.fr')).toMatch(/^[A-Za-z0-9_-]{22}$/);
	});
});

describe('liens', () => {
	it('encode l adresse et retire la barre finale de l origine', () => {
		const url = unsubscribeUrl('https://humanitour.fr/', key, 'jeanne+info@b.fr');
		expect(url).toBe(
			`https://humanitour.fr/infolettre/desinscription?adresse=jeanne%2Binfo%40b.fr&cle=${signAddress(key, 'jeanne+info@b.fr')}`
		);
	});

	it('pointe le lien en un clic vers sa propre route', () => {
		expect(oneClickUrl('https://humanitour.fr', key, 'a@b.fr')).toContain(
			'/infolettre/desinscription/un-clic?'
		);
	});

	it('ecrit les en-tetes de desinscription en un clic', () => {
		const headers = listUnsubscribeHeaders('https://humanitour.fr', key, 'a@b.fr');
		expect(headers['List-Unsubscribe']).toMatch(
			/^<https:\/\/humanitour\.fr\/infolettre\/desinscription\/un-clic\?adresse=a%40b\.fr&cle=[\w-]+>, <mailto:contact@humanitour\.fr\?subject=D%C3%A9sinscription>$/
		);
		expect(headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
	});
});
