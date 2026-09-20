import { describe, expect, it } from 'vitest';
import { ADMIN_NAVIGATION, allLinks, currentLink, visibleNavigation } from './navigation';
import { isPermission, PERMISSION_KEYS } from '$lib/shared/permissions';

const root = { permissions: PERMISSION_KEYS as string[] };

describe('ADMIN_NAVIGATION', () => {
	it('ne demande que des permissions du registre', () => {
		// Une cle inventee ici cacherait la section a tout le monde en silence,
		// puisque `can` repondrait simplement faux.
		for (const link of allLinks()) expect(isPermission(link.permission)).toBe(true);
	});

	it('ne pointe deux fois vers la meme adresse', () => {
		const hrefs = allLinks().map((link) => link.href);
		expect(new Set(hrefs).size).toBe(hrefs.length);
	});

	it('reste sous le back-office', () => {
		for (const link of allLinks()) expect(link.href.startsWith('/admin/')).toBe(true);
	});
});

describe('visibleNavigation', () => {
	it('rend tout le plan a qui detient tout', () => {
		expect(visibleNavigation(root)).toHaveLength(ADMIN_NAVIGATION.length);
	});

	it('ne rend rien sans compte', () => {
		expect(visibleNavigation(null)).toEqual([]);
	});

	it('retire un groupe dont toutes les entrees sont tombees', () => {
		// « Le systeme » ne contient que des ecrans d'administration : un compte de
		// la redaction ne doit pas voir un titre de groupe vide.
		const editor = { permissions: ['content.read', 'media.read'] };
		const sections = visibleNavigation(editor);

		expect(sections.map((section) => section.label)).toEqual(['Le site']);
		expect(sections[0]?.links.map((link) => link.href)).toEqual([
			'/admin/contenu',
			'/admin/medias'
		]);
	});
});

describe('currentLink', () => {
	it('reconnait une section a son adresse exacte', () => {
		expect(currentLink('/admin/medias')?.label).toBe('Médiathèque');
	});

	it('rattache une sous-page a sa section', () => {
		expect(currentLink('/admin/sondages/abc/questions/def')?.href).toBe('/admin/sondages');
	});

	it("ne rattache rien a une adresse hors du plan", () => {
		expect(currentLink('/admin')).toBeNull();
		expect(currentLink('/admin/recherche')).toBeNull();
	});

	it('ne confond pas deux sections dont une adresse prefixe l autre', () => {
		// `/admin/contenu` ne doit pas capter `/admin/contenus-divers` : la
		// comparaison porte sur le segment entier, pas sur la chaine.
		expect(currentLink('/admin/contenux')).toBeNull();
	});
});
