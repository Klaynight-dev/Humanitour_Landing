import { describe, expect, it } from 'vitest';
import { canUseMailbox } from './access';
import { replyRecipients } from './address';
import { checkAttachments, formatBytes, isSafeInline, MAX_ATTACHMENTS_BYTES } from './attachments';
import {
	bulkUpdate,
	DEFAULT_VIEW,
	folderView,
	FOLDER_VIEWS,
	moveTarget,
	viewFilter
} from './folders';
import { hasRemoteImages, sandboxedDocument, sandboxPolicy } from './sandbox';

describe('canUseMailbox', () => {
	it('reserve une boite personnelle a son titulaire', () => {
		const personal = { kind: 'PERSONAL' as const, ownerId: 'u1', memberIds: ['u2'] };
		expect(canUseMailbox(personal, 'u1')).toBe(true);
		expect(canUseMailbox(personal, 'u2')).toBe(false);
	});

	it('ouvre une boite partagee a ses membres seulement', () => {
		const shared = { kind: 'SHARED' as const, ownerId: null, memberIds: ['u2'] };
		expect(canUseMailbox(shared, 'u2')).toBe(true);
		expect(canUseMailbox(shared, 'u3')).toBe(false);
	});
});

describe('vues de dossier', () => {
	it('se rabat sur la boite de reception pour une cle inconnue', () => {
		expect(folderView('nimporte').key).toBe(DEFAULT_VIEW);
		expect(folderView(null).key).toBe('reception');
		expect(folderView('corbeille').label).toBe('Corbeille');
	});

	it('traduit chaque vue en filtre', () => {
		expect(viewFilter('reception')).toEqual({ folder: 'INBOX' });
		expect(viewFilter('archives')).toEqual({ folder: 'ARCHIVE' });
		expect(viewFilter('indesirables')).toEqual({ folder: 'SPAM' });
		expect(viewFilter('corbeille')).toEqual({ folder: 'TRASH' });
	});

	it('garde les suivis et les envoyes hors de la corbeille et des indesirables', () => {
		expect(viewFilter('suivis')).toEqual({ starred: true, folder: { notIn: ['TRASH', 'SPAM'] } });
		expect(viewFilter('envoyes')).toEqual({
			hasOutbound: true,
			folder: { notIn: ['TRASH', 'SPAM'] }
		});
	});

	it('donne un texte a chaque vue vide', () => {
		for (const view of FOLDER_VIEWS) expect(view.empty).not.toBe('');
	});

	it('connait les deplacements proposes', () => {
		expect(moveTarget('archiver')).toBe('ARCHIVE');
		expect(moveTarget('corbeille')).toBe('TRASH');
		expect(moveTarget('ailleurs')).toBeNull();
	});

	it('traduit chaque action groupee en mise a jour', () => {
		expect(bulkUpdate('archiver')).toEqual({ folder: 'ARCHIVE' });
		expect(bulkUpdate('lu')).toEqual({ unread: false });
		expect(bulkUpdate('nonlu')).toEqual({ unread: true });
		expect(bulkUpdate('suivre')).toEqual({ starred: true });
		expect(bulkUpdate('nepassuivre')).toEqual({ starred: false });
		expect(bulkUpdate('effacer')).toBeNull();
	});
});

describe('replyRecipients', () => {
	const inbound = {
		direction: 'INBOUND' as const,
		fromAddress: 'bob@exemple.fr',
		to: ['contact@humanitour.fr', 'Alice <alice@exemple.fr>'],
		cc: ['carole@exemple.fr'],
		replyTo: []
	};

	it('repond a l expediteur d un message recu', () => {
		expect(replyRecipients(inbound, 'contact@humanitour.fr', false)).toEqual({
			to: ['bob@exemple.fr'],
			cc: []
		});
	});

	it('prefere le Reply-To quand il existe', () => {
		expect(
			replyRecipients(
				{ ...inbound, replyTo: ['Bob <bob.perso@exemple.fr>'] },
				'contact@humanitour.fr',
				false
			).to
		).toEqual(['bob.perso@exemple.fr']);
	});

	it('met les autres en copie pour repondre a tous, jamais la boite elle-meme', () => {
		expect(replyRecipients(inbound, 'contact@humanitour.fr', true)).toEqual({
			to: ['bob@exemple.fr'],
			cc: ['alice@exemple.fr', 'carole@exemple.fr']
		});
	});

	it('relance les destinataires d un message envoye par l equipe', () => {
		const outbound = {
			direction: 'OUTBOUND' as const,
			fromAddress: 'contact@humanitour.fr',
			to: ['presse@journal.fr'],
			cc: [],
			replyTo: []
		};
		expect(replyRecipients(outbound, 'contact@humanitour.fr', true)).toEqual({
			to: ['presse@journal.fr'],
			cc: []
		});
	});
});

describe('pieces jointes', () => {
	it('accepte des pieces ordinaires sous la limite', () => {
		expect(checkAttachments([{ name: 'rapport.pdf', size: 1000 }])).toBeNull();
		expect(checkAttachments([])).toBeNull();
	});

	it('refuse un programme, quelle que soit la casse', () => {
		expect(checkAttachments([{ name: 'facture.PDF.EXE', size: 10 }])).toContain('facture.PDF.EXE');
	});

	it('refuse un total trop lourd', () => {
		const half = MAX_ATTACHMENTS_BYTES / 2 + 1;
		expect(
			checkAttachments([
				{ name: 'a.pdf', size: half },
				{ name: 'b.pdf', size: half }
			])
		).toContain('25 Mo');
	});

	it('n affiche en ligne que les images matricielles', () => {
		expect(isSafeInline('image/PNG')).toBe(true);
		expect(isSafeInline('image/jpeg; name=a.jpg')).toBe(true);
		expect(isSafeInline('image/svg+xml')).toBe(false);
		expect(isSafeInline('text/html')).toBe(false);
		expect(isSafeInline('application/pdf')).toBe(false);
	});

	it('ecrit une taille en francais', () => {
		expect(formatBytes(512)).toBe('512 o');
		expect(formatBytes(1536)).toBe('1,5 Ko');
		expect(formatBytes(25 * 1024 * 1024)).toBe('25 Mo');
		expect(formatBytes(3 * 1024 ** 4)).toBe('3 072 Go');
	});
});

describe('sandbox', () => {
	it('bloque les images distantes par defaut, les autorise sur demande', () => {
		expect(sandboxPolicy({ remoteImages: false })).toContain('img-src data:;');
		expect(sandboxPolicy({ remoteImages: true })).toContain('img-src data: https:;');
		expect(sandboxPolicy({ remoteImages: false })).toContain("default-src 'none'");
	});

	it('repere une image distante dans une balise ou un style', () => {
		expect(hasRemoteImages('<img alt="" src="https://tracker.example/p.gif">')).toBe(true);
		expect(hasRemoteImages('<td style="background:url(\'http://x.fr/a.png\')">')).toBe(true);
		expect(hasRemoteImages('<img src="data:image/png;base64,AAA">')).toBe(false);
	});

	it('pose la politique, le referent et la cible avant le HTML recu', () => {
		const doc = sandboxedDocument('<base target="_self"><p>Bonjour</p>', { remoteImages: false });
		expect(doc.indexOf('Content-Security-Policy')).toBeLessThan(doc.indexOf('<p>Bonjour'));
		expect(doc.indexOf('<base target="_blank">')).toBeLessThan(
			doc.indexOf('<base target="_self">')
		);
		expect(doc).toContain('no-referrer');
	});
});
