import { describe, expect, it } from 'vitest';
import {
	can,
	canAll,
	canAny,
	isPermission,
	isSensitive,
	PERMISSION_KEYS,
	PERMISSIONS,
	permissionsByGroup,
	sanitizePermissions
} from './permissions';

describe('registre des permissions', () => {
	it('expose chaque cle declaree', () => {
		expect(PERMISSION_KEYS.length).toBe(Object.keys(PERMISSIONS).length);
		expect(PERMISSION_KEYS).toContain('survey.publish');
	});

	it('decrit chaque permission : un ecran de roles sans libelle est inutilisable', () => {
		for (const key of PERMISSION_KEYS) {
			const definition = PERMISSIONS[key];
			expect(definition.label.length).toBeGreaterThan(0);
			expect(definition.description.length).toBeGreaterThan(0);
			expect(definition.group.length).toBeGreaterThan(0);
		}
	});

	it('marque comme sensible ce qui rend une donnee publique', () => {
		// Publier, c est irreversible aux yeux du public : ces permissions doivent
		// ressortir dans l interface d edition des roles.
		expect(PERMISSIONS['survey.publish'].sensitive).toBe(true);
		expect(PERMISSIONS['media.publish'].sensitive).toBe(true);
		expect(PERMISSIONS['settings.manage'].sensitive).toBe(true);
	});

	it('reconnait une cle existante et rejette une cle inventee', () => {
		expect(isPermission('survey.read')).toBe(true);
		expect(isPermission('survey.telepathy')).toBe(false);
	});
});

describe('sanitizePermissions', () => {
	it('conserve les cles connues', () => {
		expect(sanitizePermissions(['survey.read', 'media.write'])).toEqual([
			'survey.read',
			'media.write'
		]);
	});

	it('ecarte une permission retiree du registre sans faire echouer la resolution', () => {
		// Un role peut porter la permission d une fonctionnalite desinstallee :
		// on l ignore, on n echoue pas, et on ne l accorde pas non plus.
		expect(sanitizePermissions(['survey.read', 'module.supprime'])).toEqual(['survey.read']);
	});

	it('retourne une liste vide pour des cles toutes inconnues', () => {
		expect(sanitizePermissions(['a', 'b'])).toEqual([]);
	});
});

describe('can', () => {
	const editor = { permissions: ['media.write', 'media.read'] };

	it('accorde une permission detenue', () => {
		expect(can(editor, 'media.write')).toBe(true);
	});

	it('refuse une permission absente', () => {
		expect(can(editor, 'survey.publish')).toBe(false);
	});

	it('refuse tout a un visiteur anonyme', () => {
		expect(can(null, 'media.read')).toBe(false);
		expect(canAny(null, ['media.read'])).toBe(false);
		expect(canAll(null, ['media.read'])).toBe(false);
	});

	it('n accorde aucun droit implicite par joker', () => {
		// Il n existe pas de super-utilisateur cache : un role qui porterait « * »
		// n obtient rien. Le role d administration porte la liste complete.
		expect(can({ permissions: ['*'] }, 'survey.delete')).toBe(false);
	});
});

describe('canAny et canAll', () => {
	const holder = { permissions: ['survey.read', 'survey.write'] };

	it('canAny suffit a une seule correspondance', () => {
		expect(canAny(holder, ['survey.delete', 'survey.read'])).toBe(true);
		expect(canAny(holder, ['survey.delete'])).toBe(false);
	});

	it('canAll exige toutes les correspondances', () => {
		expect(canAll(holder, ['survey.read', 'survey.write'])).toBe(true);
		expect(canAll(holder, ['survey.read', 'survey.publish'])).toBe(false);
	});

	it('canAll est vrai pour une liste vide, canAny est faux', () => {
		expect(canAll(holder, [])).toBe(true);
		expect(canAny(holder, [])).toBe(false);
	});
});

describe('permissionsByGroup', () => {
	it('regroupe sans perdre ni dupliquer une permission', () => {
		const groups = permissionsByGroup();
		const flattened = [...groups.values()].flat();

		expect(flattened.length).toBe(PERMISSION_KEYS.length);
		expect(new Set(flattened).size).toBe(PERMISSION_KEYS.length);
	});

	it('place chaque permission dans le groupe qu elle declare', () => {
		const groups = permissionsByGroup();

		expect(groups.get('Sondages')).toContain('survey.import');
		expect(groups.get('Equipe')).toContain('role.manage');
	});
});

describe('isSensitive', () => {
	it('reconnait une permission qui rend une donnee publique', () => {
		expect(isSensitive('survey.publish')).toBe(true);
		expect(isSensitive('media.publish')).toBe(true);
	});

	it('rend faux pour une permission qui ne declare pas le drapeau', () => {
		// Le type litteral issu de `as const` ne porte pas la propriete du tout :
		// c est exactement ce que l accesseur rattrape.
		expect(isSensitive('survey.read')).toBe(false);
		expect(isSensitive('media.read')).toBe(false);
	});
});
