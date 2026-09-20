import { describe, expect, it } from 'vitest';
import { readNested } from './form';

function build(entries: Record<string, string>): FormData {
	const form = new FormData();
	for (const [name, value] of Object.entries(entries)) form.append(name, value);
	return form;
}

describe('lecture d un formulaire de section', () => {
	it('ne lit que les champs prefixes', () => {
		const form = build({ 'data.title': 'Un titre', id: 'abc', type: 'cover' });
		expect(readNested(form, 'data')).toEqual({ title: 'Un titre' });
	});

	it('reconstruit une image et ses dimensions', () => {
		const form = build({
			'data.image.src': '/photos/a.jpg',
			'data.image.alt': 'Un vélo',
			'data.image.width': '2048'
		});

		expect(readNested(form, 'data')).toEqual({
			image: { src: '/photos/a.jpg', alt: 'Un vélo', width: '2048' }
		});
	});

	it('reconstruit une liste dans l ordre des rangs', () => {
		const form = build({
			'data.items.1.value': 'deux',
			'data.items.0.value': 'un',
			'data.items.10.value': 'onze'
		});

		// Le rang 10 vient apres le rang 2, pas apres le rang 1 : le tri est
		// numerique, pas alphabetique.
		expect(readNested(form, 'data')).toEqual({
			items: [{ value: 'un' }, { value: 'deux' }, { value: 'onze' }]
		});
	});

	it('resserre les rangs laisses par une ligne retiree', () => {
		// Retirer la deuxieme ligne de trois laisse les rangs 0 et 2 : sans
		// resserrement, la validation verrait une ligne vide au milieu.
		const form = build({ 'data.items.0.value': 'un', 'data.items.2.value': 'trois' });
		expect(readNested(form, 'data')).toEqual({ items: [{ value: 'un' }, { value: 'trois' }] });
	});

	it('garde les chaines vides, qui disent « ce champ a ete vide »', () => {
		const form = build({ 'data.title': '' });
		expect(readNested(form, 'data')).toEqual({ title: '' });
	});

	it('ecarte un fichier depose dans un champ de contenu', () => {
		const form = new FormData();
		form.append('data.image.src', new File(['x'], 'a.png', { type: 'image/png' }));
		form.append('data.image.alt', 'Une description');

		expect(readNested(form, 'data')).toEqual({ image: { alt: 'Une description' } });
	});

	it('rend un objet vide quand rien n est prefixe', () => {
		expect(readNested(build({ autre: 'x' }), 'data')).toEqual({});
	});
});
