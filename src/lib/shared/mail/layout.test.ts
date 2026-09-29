import { describe, expect, it } from 'vitest';
import { brandedEmail, plainEmail } from './layout';

describe('brandedEmail', () => {
	const base = {
		subject: 'Les résultats <enfin>',
		markdown: '# Bonjour\n\nLe texte.',
		reason: 'Vous recevez ce courriel parce que vous êtes abonné·e.'
	};

	it('produit un document complet, objet echappe', () => {
		const { html } = brandedEmail(base);
		expect(html.startsWith('<!doctype html>')).toBe(true);
		expect(html).toContain('<html lang="fr">');
		expect(html).toContain('<title>Les résultats &lt;enfin&gt;</title>');
		expect(html).toMatch(/<h1[^>]*>Bonjour<\/h1>/);
	});

	it('porte le bandeau de marque avec un repli de couleur unie', () => {
		const { html } = brandedEmail(base);
		expect(html).toContain('bgcolor="#FF5757"');
		expect(html).toContain('linear-gradient(90deg,#FF5757,#FF88B7,#FF751F)');
	});

	it('ajoute le texte d apercu seulement quand il est fourni', () => {
		expect(brandedEmail(base).html).not.toContain('display:none');
		expect(brandedEmail({ ...base, preheader: 'Aperçu' }).html).toContain('Aperçu</div>');
	});

	it('met le lien de desinscription dans le HTML et dans le texte', () => {
		const email = brandedEmail({
			...base,
			unsubscribeUrl: 'https://humanitour.fr/infolettre/desinscription?a=1&b=2'
		});
		expect(email.html).toContain(
			'href="https://humanitour.fr/infolettre/desinscription?a=1&amp;b=2"'
		);
		expect(email.text).toContain(
			'Se désinscrire : https://humanitour.fr/infolettre/desinscription?a=1&b=2'
		);
	});

	it('n a pas de lien de desinscription sans adresse', () => {
		expect(brandedEmail(base).html).not.toContain('désinscrire');
	});

	it('rend une version texte avec la raison et l identite legale', () => {
		const { text } = brandedEmail(base);
		expect(text).toContain('Bonjour\n\nLe texte.');
		expect(text).toContain(base.reason);
		expect(text).toContain('HUMANITOUR');
	});
});

describe('plainEmail', () => {
	it('rend le texte seul, sans habillage de marque', () => {
		const { html, text } = plainEmail({ subject: 'Re: Question', markdown: 'Bonjour **Alice**' });
		expect(html).toContain('<strong>Alice</strong>');
		expect(html).not.toContain('#FF5757');
		expect(text).toBe('Bonjour Alice\n');
	});

	it('ajoute la signature sous le separateur conventionnel', () => {
		const { html, text } = plainEmail({
			subject: 'x',
			markdown: 'Corps',
			signature: '  Elouan\nHumanitour  '
		});
		expect(html).toContain('-- <br>');
		expect(text).toBe('Corps\n\n-- \nElouan\nHumanitour\n');
	});

	it('ignore une signature vide', () => {
		expect(plainEmail({ subject: 'x', markdown: 'Corps', signature: '   ' }).text).toBe('Corps\n');
	});

	it('cite le message d origine, echappe', () => {
		const { html, text } = plainEmail({
			subject: 'x',
			markdown: 'Réponse',
			quoted: { header: 'Le 1 octobre, Bob a écrit :', text: 'Ligne <1>\nLigne 2' }
		});
		expect(html).toContain('Ligne &lt;1&gt;<br>Ligne 2');
		expect(text).toBe('Réponse\n\nLe 1 octobre, Bob a écrit :\n> Ligne <1>\n> Ligne 2\n');
	});
});
