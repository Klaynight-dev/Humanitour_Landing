import { describe, expect, it } from 'vitest';
import {
	baseSubject,
	formatMailbox,
	forwardHeader,
	forwardSubject,
	messageIds,
	parseMailbox,
	parseRecipients,
	quoteHeader,
	replyReferences,
	replySubject,
	snippet
} from './address';

describe('parseMailbox', () => {
	it('lit une adresse seule, normalisee', () => {
		expect(parseMailbox(' Alice@Exemple.FR ')).toEqual({ name: null, address: 'alice@exemple.fr' });
	});

	it('lit un nom et une adresse', () => {
		expect(parseMailbox('Alice Martin <alice@exemple.fr>')).toEqual({
			name: 'Alice Martin',
			address: 'alice@exemple.fr'
		});
	});

	it('retire les guillemets du nom', () => {
		expect(parseMailbox('"Martin, Alice" <alice@exemple.fr>')).toEqual({
			name: 'Martin, Alice',
			address: 'alice@exemple.fr'
		});
	});

	it('refuse une saisie vide ou invalide', () => {
		expect(parseMailbox('   ')).toBeNull();
		expect(parseMailbox('Alice <pas-une-adresse>')).toBeNull();
	});

	it('traite des chevrons vides de nom comme une adresse seule', () => {
		expect(parseMailbox('<alice@exemple.fr>')).toEqual({ name: null, address: 'alice@exemple.fr' });
	});
});

describe('formatMailbox', () => {
	it('rend l adresse seule sans nom', () => {
		expect(formatMailbox({ name: null, address: 'a@b.fr' })).toBe('a@b.fr');
	});

	it('met le nom entre guillemets s il contient un separateur', () => {
		expect(formatMailbox({ name: 'Martin, Alice', address: 'a@b.fr' })).toBe(
			'"Martin, Alice" <a@b.fr>'
		);
		expect(formatMailbox({ name: 'Humanitour', address: 'a@b.fr' })).toBe('Humanitour <a@b.fr>');
	});

	it('retire du nom ce qui casserait l en-tete', () => {
		expect(formatMailbox({ name: 'A "<b>"\r\nBcc: x', address: 'a@b.fr' })).toBe(
			'"A bBcc: x" <a@b.fr>'
		);
	});
});

describe('parseRecipients', () => {
	it('decoupe sur virgule, point-virgule et retour a la ligne, sans doublon', () => {
		expect(parseRecipients('a@b.fr, C@d.fr; a@b.fr\n"Nom, Prénom" <e@f.fr>')).toEqual({
			addresses: ['a@b.fr', 'c@d.fr', 'e@f.fr'],
			invalid: []
		});
	});

	it('rend les saisies invalides telles que tapees', () => {
		expect(parseRecipients('a@b.fr, nimporte quoi, ,')).toEqual({
			addresses: ['a@b.fr'],
			invalid: ['nimporte quoi']
		});
	});
});

describe('objets', () => {
	it('retire les prefixes empiles, francais et anglais', () => {
		expect(baseSubject('RE: Tr: Fwd: re[2]: Question')).toBe('Question');
		expect(baseSubject('Réf : Dossier')).toBe('Dossier');
		expect(baseSubject('Rebond du vélo')).toBe('Rebond du vélo');
	});

	it('ecrit un seul prefixe de reponse ou de transfert', () => {
		expect(replySubject('Re: Re: Question')).toBe('Re: Question');
		expect(forwardSubject('Question')).toBe('Tr: Question');
	});

	it('nomme un objet vide', () => {
		expect(replySubject('')).toBe('Re: (sans objet)');
		expect(forwardSubject(' Re: ')).toBe('Tr: (sans objet)');
	});
});

describe('citations', () => {
	const date = new Date('2026-09-29T12:03:00Z');

	it('date la citation a l heure de Paris', () => {
		expect(quoteHeader(date, { name: 'Alice', address: 'a@b.fr' })).toBe(
			'Le 29 septembre 2026 à 14:03, Alice <a@b.fr> a écrit :'
		);
	});

	it('ecrit l en-tete d un transfert', () => {
		const header = forwardHeader({
			date,
			from: { name: null, address: 'a@b.fr' },
			to: ['c@d.fr', 'e@f.fr'],
			subject: 'Q'
		});
		expect(header).toContain('De : a@b.fr');
		expect(header).toContain('À : c@d.fr, e@f.fr');
		expect(header).toContain('Objet : Q');
	});
});

describe('snippet', () => {
	it('aplatit le texte et saute les lignes citees', () => {
		expect(snippet('Bonjour,\n\n> ancien message\nmerci   beaucoup')).toBe(
			'Bonjour, merci beaucoup'
		);
	});

	it('coupe au-dela de la longueur demandee', () => {
		expect(snippet('abcdefghij', 5)).toBe('abcd…');
	});

	it('rend une chaine vide sans texte', () => {
		expect(snippet(null)).toBe('');
	});
});

describe('identifiants de message', () => {
	it('extrait les identifiants d un en-tete replie', () => {
		expect(messageIds('<a@x>\r\n <b@y>  <c@z>')).toEqual(['<a@x>', '<b@y>', '<c@z>']);
		expect(messageIds(null)).toEqual([]);
	});

	it('ajoute le message cite a la chaine, une seule fois', () => {
		expect(replyReferences('<a@x>', '<b@y>')).toBe('<a@x> <b@y>');
		expect(replyReferences('<a@x> <b@y>', '<b@y>')).toBe('<a@x> <b@y>');
		expect(replyReferences(null, null)).toBeNull();
	});
});
