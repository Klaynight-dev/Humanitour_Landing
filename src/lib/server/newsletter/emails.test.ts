import { describe, expect, it } from 'vitest';
import { CAMPAIGN_REASON } from '$lib/shared/newsletter';
import { campaignEmail, confirmationEmail, confirmationUrl } from './emails';

describe('confirmation', () => {
	it('construit le lien a partir de l origine publique', () => {
		expect(confirmationUrl('https://humanitour.fr/', 'abc')).toBe(
			'https://humanitour.fr/infolettre/confirmer/abc'
		);
	});

	it('met le lien dans un bouton et en clair dans la version texte', () => {
		const url = 'https://humanitour.fr/infolettre/confirmer/abc';
		const { html, text } = confirmationEmail(url);
		expect(html).toContain(`href="${url}"`);
		expect(html).toContain('Confirmer mon inscription');
		expect(text).toContain(`Confirmer mon inscription : ${url}`);
		expect(text).toContain('effacée dans 30 jours');
	});

	it('n ajoute pas de lien de desinscription a une adresse qui n est pas inscrite', () => {
		expect(confirmationEmail('https://x.fr').html).not.toContain('désinscrire');
	});
});

describe('campaignEmail', () => {
	it('rend le corps, l apercu, le motif et le lien de desinscription', () => {
		const email = campaignEmail(
			{ subject: 'Les résultats', preheader: 'Enfin publiés', markdown: '[Les données](/donnees)' },
			'https://humanitour.fr',
			'https://humanitour.fr/infolettre/desinscription?adresse=a%40b.fr&cle=x'
		);
		expect(email.html).toContain('href="https://humanitour.fr/donnees"');
		expect(email.html).toContain('Enfin publiés</div>');
		expect(email.text).toContain(CAMPAIGN_REASON);
		expect(email.text).toContain(
			'Se désinscrire : https://humanitour.fr/infolettre/desinscription?adresse=a%40b.fr&cle=x'
		);
	});

	it('se passe d apercu', () => {
		const email = campaignEmail(
			{ subject: 'S', preheader: null, markdown: 'Corps' },
			'https://h.fr',
			'https://h.fr/d'
		);
		expect(email.html).not.toContain('display:none');
	});
});
