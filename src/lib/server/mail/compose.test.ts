import { describe, expect, it } from 'vitest';
import { readCompose } from './compose';

function form(values: Record<string, string>, files: File[] = []): FormData {
	const data = new FormData();
	for (const [key, value] of Object.entries(values)) data.set(key, value);
	for (const file of files) data.append('files', file);
	return data;
}

const valid = {
	to: 'Bob <bob@exemple.fr>',
	cc: '',
	bcc: '',
	subject: ' Bonjour ',
	markdown: 'Texte'
};

describe('readCompose', () => {
	it('lit un message complet, adresses normalisees', () => {
		const result = readCompose(form({ ...valid, cc: 'a@b.fr; c@d.fr', bcc: 'e@f.fr' }));
		expect(result).toMatchObject({
			ok: true,
			to: ['bob@exemple.fr'],
			cc: ['a@b.fr', 'c@d.fr'],
			bcc: ['e@f.fr'],
			subject: 'Bonjour',
			markdown: 'Texte',
			files: []
		});
	});

	it('garde les fichiers joints et ignore un champ fichier vide', () => {
		const result = readCompose(
			form(valid, [new File(['abc'], 'plan.pdf', { type: 'application/pdf' }), new File([], '')])
		);
		expect(result.ok && result.files.map((file) => file.name)).toEqual(['plan.pdf']);
	});

	it('nomme les adresses illisibles et rend la saisie', () => {
		const result = readCompose(form({ ...valid, to: 'bob@exemple.fr, pas une adresse' }));
		expect(result).toMatchObject({
			ok: false,
			message: 'Adresse illisible : « pas une adresse ».',
			values: { to: 'bob@exemple.fr, pas une adresse', markdown: 'Texte' }
		});
	});

	it('exige un destinataire, un objet et un texte', () => {
		expect(readCompose(form({ ...valid, to: '' }))).toMatchObject({
			ok: false,
			message: 'Indiquez au moins un destinataire.'
		});
		expect(readCompose(form({ ...valid, subject: '  ' }))).toMatchObject({
			ok: false,
			message: "L'objet est vide."
		});
		expect(readCompose(form({ ...valid, markdown: '\n ' }))).toMatchObject({
			ok: false,
			message: 'Le message est vide.'
		});
	});

	it('refuse un objet trop long', () => {
		expect(readCompose(form({ ...valid, subject: 'x'.repeat(251) })).ok).toBe(false);
	});

	it('renvoie vers l infolettre au-dela de cinquante destinataires', () => {
		const many = Array.from({ length: 51 }, (_, index) => `p${index}@exemple.fr`).join(', ');
		const result = readCompose(form({ ...valid, to: many }));
		expect(result.ok).toBe(false);
		expect(!result.ok && result.message).toContain('campagne');
	});

	it('refuse une piece jointe executable', () => {
		const result = readCompose(form(valid, [new File(['x'], 'outil.exe')]));
		expect(!result.ok && result.message).toContain('outil.exe');
	});

	it('tolere des champs absents', () => {
		expect(readCompose(new FormData())).toMatchObject({
			ok: false,
			values: { to: '', subject: '' }
		});
	});
});
