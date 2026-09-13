import { describe, expect, it } from 'vitest';
import { toColumnKey, toSlug, uniqueSlug } from './slug';

describe('toSlug', () => {
	it('met en minuscules et remplace les espaces', () => {
		expect(toSlug('Presidentielle 2027')).toBe('presidentielle-2027');
	});

	it('translittere les accents', () => {
		expect(toSlug("L'écologie à vélo")).toBe('l-ecologie-a-velo');
	});

	it('supprime la ponctuation de bord', () => {
		expect(toSlug('  --- Etape 12 ! ---  ')).toBe('etape-12');
	});

	it('ne laisse jamais de separateur en fin apres troncature', () => {
		// Sans le nettoyage final, couper a la longueur maximale pourrait laisser
		// une adresse se terminant par un tiret.
		expect(toSlug('a'.repeat(78) + ' bc', 80).endsWith('-')).toBe(false);
	});

	it('borne la longueur', () => {
		expect(toSlug('mot '.repeat(60)).length).toBeLessThanOrEqual(80);
	});

	it('rend un repli plutot qu une chaine vide', () => {
		expect(toSlug('!!!')).toBe('sans-titre');
		expect(toSlug('')).toBe('sans-titre');
	});
});

describe('toColumnKey', () => {
	it('utilise le souligne, pour comparer des noms de colonnes', () => {
		expect(toColumnKey('Quelle est votre priorité ?')).toBe('quelle_est_votre_priorite');
	});

	it('rapproche deux ecritures du meme intitule', () => {
		expect(toColumnKey('Pouvoir d achat')).toBe(toColumnKey("POUVOIR-D'ACHAT"));
	});
});

describe('uniqueSlug', () => {
	it('laisse le slug intact quand il est libre', () => {
		expect(uniqueSlug('etape-12', ['etape-11'])).toBe('etape-12');
	});

	it('suffixe un numero lisible en cas de collision', () => {
		expect(uniqueSlug('etape-12', ['etape-12'])).toBe('etape-12-2');
		expect(uniqueSlug('etape-12', ['etape-12', 'etape-12-2'])).toBe('etape-12-3');
	});

	it('echoue bruyamment sur un nombre absurde de collisions', () => {
		const taken = ['etape', ...Array.from({ length: 999 }, (_, i) => `etape-${i + 2}`)];
		expect(() => uniqueSlug('etape', taken)).toThrow(/unique/i);
	});
});
