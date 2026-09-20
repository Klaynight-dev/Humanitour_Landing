import { describe, expect, it } from 'vitest';
import { insertAfter, move, moveTo, removeAt } from './arrange';

const PAGE = ['a', 'b', 'c', 'd'];


describe('move', () => {
	it('echange deux voisines', () => {
		expect(move(PAGE, 1, -1)).toEqual(['b', 'a', 'c', 'd']);
		expect(move(PAGE, 1, 1)).toEqual(['a', 'c', 'b', 'd']);
	});

	it('ne fait rien aux extremites', () => {
		expect(move(PAGE, 0, -1)).toEqual(PAGE);
		expect(move(PAGE, 3, 1)).toEqual(PAGE);
	});

	it('ne fait rien sur un rang qui n existe pas', () => {
		expect(move(PAGE, 9, -1)).toEqual(PAGE);
		expect(move(PAGE, -1, 1)).toEqual(PAGE);
	});

	it('rend un nouveau tableau sans toucher a l original', () => {
		const source = [...PAGE];
		move(source, 1, 1);
		expect(source).toEqual(PAGE);
	});
});

describe('moveTo', () => {
	it('depose une section plus bas', () => {
		// « a » retire, le tableau vaut b, c, d ; l'inserer au rang 2 le pose
		// entre c et d, ce qu'on voit en relachant a cet endroit.
		expect(moveTo(PAGE, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
	});

	it('depose une section plus haut', () => {
		expect(moveTo(PAGE, 3, 0)).toEqual(['d', 'a', 'b', 'c']);
	});

	it('ne fait rien quand la section ne bouge pas', () => {
		expect(moveTo(PAGE, 2, 2)).toEqual(PAGE);
	});

	it('ignore un rang hors du tableau', () => {
		expect(moveTo(PAGE, 0, 9)).toEqual(PAGE);
		expect(moveTo(PAGE, 9, 0)).toEqual(PAGE);
	});
});

describe('removeAt', () => {
	it('retire la section demandee', () => {
		expect(removeAt(PAGE, 1)).toEqual(['a', 'c', 'd']);
	});

	it('ignore un rang hors du tableau', () => {
		expect(removeAt(PAGE, 9)).toEqual(PAGE);
		expect(removeAt(PAGE, -1)).toEqual(PAGE);
	});

	it('vide une page d une seule section', () => {
		expect(removeAt(['seule'], 0)).toEqual([]);
	});
});

describe('insertAfter', () => {
	it('pose juste apres le rang demande', () => {
		expect(insertAfter(PAGE, 1, 'x')).toEqual(['a', 'b', 'x', 'c', 'd']);
	});

	it('pose en tete avec -1', () => {
		expect(insertAfter(PAGE, -1, 'x')).toEqual(['x', 'a', 'b', 'c', 'd']);
	});

	it('pose en fin avec la longueur', () => {
		expect(insertAfter(PAGE, PAGE.length, 'x')).toEqual([...PAGE, 'x']);
	});

	it('pose en fin plutot que de perdre la section sur un rang aberrant', () => {
		expect(insertAfter(PAGE, 99, 'x')).toEqual([...PAGE, 'x']);
	});

	it('pose en tete sur un rang negatif aberrant', () => {
		expect(insertAfter(PAGE, -9, 'x')).toEqual(['x', ...PAGE]);
	});
});

