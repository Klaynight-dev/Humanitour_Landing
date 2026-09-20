import { describe, expect, it } from 'vitest';
import { collapseOther, isOtherValue, OTHER_MODALITY_CODE } from './other';

describe('isOtherValue', () => {
	it('reconnait la case cochee sans texte', () => {
		expect(isOtherValue('__other__')).toBe(true);
	});

	it('reconnait la case cochee avec un texte libre', () => {
		expect(isOtherValue('__other__:Natacha Polony')).toBe(true);
	});

	it('ne reconnait pas une modalite ordinaire', () => {
		expect(isOtherValue('opt1')).toBe(false);
		expect(isOtherValue('autre')).toBe(false);
		// Un libelle qui contient le mot, sans la convention, n'en est pas un.
		expect(isOtherValue('Une __other__ chose')).toBe(false);
	});
});

describe('collapseOther', () => {
	it('range la reponse libre dans la modalite « Autre »', () => {
		expect(collapseOther('__other__')).toBe(OTHER_MODALITY_CODE);
	});

	it('JETTE le texte libre', () => {
		// Le point de la fonction : « Natacha Polony » ne doit pas atteindre la
		// base. Un verbatim identifie son auteur par son contenu.
		expect(collapseOther('__other__:Natacha Polony')).toBe(OTHER_MODALITY_CODE);
		expect(collapseOther('__other__:Contre toute la droite')).toBe(OTHER_MODALITY_CODE);
	});

	it('laisse passer toute autre valeur sans y toucher', () => {
		expect(collapseOther('opt1')).toBe('opt1');
		expect(collapseOther('')).toBe('');
	});
});
