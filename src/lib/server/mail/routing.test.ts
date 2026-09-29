import { describe, expect, it } from 'vitest';
import {
	attachmentKey,
	folderAfterReply,
	isInlineAttachment,
	isSpoofed,
	mergeParticipants,
	participantsOf,
	routeToMailboxes
} from './routing';

const mailboxes = [
	{ id: 'contact', address: 'contact@humanitour.fr', isCatchAll: true },
	{ id: 'elouan', address: 'elouan@humanitour.fr', isCatchAll: false },
	{ id: 'presse', address: 'presse@humanitour.fr', isCatchAll: false }
];

describe('routeToMailboxes', () => {
	it('remet a chaque boite nommee, quelle que soit la forme de l adresse', () => {
		expect(
			routeToMailboxes(
				['Elouan <Elouan@Humanitour.fr>', 'presse@humanitour.fr', 'ami@exemple.fr'],
				mailboxes
			)
		).toEqual(['elouan', 'presse']);
	});

	it('se rabat sur la boite attrape-tout quand aucune ne correspond', () => {
		expect(routeToMailboxes(['bonjour@humanitour.fr'], mailboxes)).toEqual(['contact']);
	});

	it('ne remet a personne sans boite attrape-tout', () => {
		expect(routeToMailboxes(['bonjour@humanitour.fr'], mailboxes.slice(1))).toEqual([]);
	});

	it('ignore les saisies illisibles', () => {
		expect(routeToMailboxes(['n importe quoi', 'presse@humanitour.fr'], mailboxes)).toEqual([
			'presse'
		]);
	});
});

describe('isSpoofed', () => {
	it('reconnait un echec DMARC, quelle que soit la casse', () => {
		expect(isSpoofed({ dmarc: 'FAIL' })).toBe(true);
		expect(isSpoofed({ dmarc: 'pass' })).toBe(false);
		expect(isSpoofed({})).toBe(false);
	});
});

describe('attachmentKey', () => {
	it('range la piece jointe sous courrier, nom assaini', () => {
		expect(attachmentKey('rcv_1', 'att_1', '../../etc/passwd')).toBe('courrier/rcv_1/att_1-passwd');
		expect(attachmentKey('rcv_1', 'att_2', 'Compte rendu été.pdf')).toBe(
			'courrier/rcv_1/att_2-Compte-rendu-ete.pdf'
		);
	});

	it('nomme une piece jointe sans nom', () => {
		expect(attachmentKey('r', 'a', null)).toBe('courrier/r/a-piece-jointe');
	});
});

describe('participants', () => {
	it('ecarte la boite elle-meme et les doublons', () => {
		expect(
			participantsOf(
				['Bob <bob@exemple.fr>', 'contact@humanitour.fr', 'bob@exemple.fr', 'x'],
				'contact@humanitour.fr'
			)
		).toEqual(['bob@exemple.fr']);
	});

	it('fusionne sans doublon, dans l ordre', () => {
		expect(mergeParticipants(['a@x.fr', 'b@x.fr'], ['b@x.fr', 'c@x.fr'])).toEqual([
			'a@x.fr',
			'b@x.fr',
			'c@x.fr'
		]);
	});
});

describe('isInlineAttachment', () => {
	it('ne tient pour integree qu une piece inline avec un identifiant', () => {
		expect(isInlineAttachment('inline', 'img001')).toBe(true);
		expect(isInlineAttachment('inline', null)).toBe(false);
		expect(isInlineAttachment('attachment', 'img001')).toBe(false);
		expect(isInlineAttachment(null, null)).toBe(false);
	});
});

describe('folderAfterReply', () => {
	it('ramene en boite de reception un fil archive ou jete', () => {
		expect(folderAfterReply('ARCHIVE')).toBe('INBOX');
		expect(folderAfterReply('TRASH')).toBe('INBOX');
	});

	it('laisse un fil en indesirables ou deja en boite de reception', () => {
		expect(folderAfterReply('SPAM')).toBe('SPAM');
		expect(folderAfterReply('INBOX')).toBe('INBOX');
	});
});
