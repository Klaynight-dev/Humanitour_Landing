import { fail } from '@sveltejs/kit';
import { recordAudit } from '$lib/server/audit';
import { prisma } from '$lib/server/db';
import { readCheckbox, readText } from '$lib/server/forms';
import { deleteThreads } from '$lib/server/mail/cleanup';
import { mailDomain } from '$lib/server/mail/config';
import { requirePermission } from '$lib/server/rbac/guard';
import { mailboxAddress } from '$lib/shared/mail/address';
import type { Actions, PageServerLoad } from './$types';

/**
 * Gestion des boites de la messagerie.
 *
 * `mail.admin` cree les boites et choisit qui les lit ; il ne donne a lire
 * aucune d'elles (`shared/mail/access.ts`). Chaque changement de membres est
 * journalise : qui a ouvert `contact@` a qui doit pouvoir etre dit.
 *
 * Une seule boite « attrape-tout » a la fois : c'est elle qui recoit le
 * courrier adresse a une adresse du domaine qui n'est la boite de personne.
 */

export const load: PageServerLoad = async ({ locals }) => {
	requirePermission(locals.user, 'mail.admin');

	const [mailboxes, users] = await Promise.all([
		prisma.mailbox.findMany({
			orderBy: [{ kind: 'asc' }, { address: 'asc' }],
			include: {
				owner: { select: { id: true, displayName: true } },
				members: { include: { user: { select: { id: true, displayName: true, email: true } } } },
				_count: { select: { threads: true } }
			}
		}),
		prisma.user.findMany({
			where: { isActive: true },
			orderBy: { displayName: 'asc' },
			select: { id: true, displayName: true, email: true }
		})
	]);

	return { mailboxes, users, domain: mailDomain() };
};

async function audit(
	actorId: string,
	action: string,
	mailboxId: string,
	metadata: Record<string, unknown>
) {
	await recordAudit({ actorId, action, entity: 'Mailbox', entityId: mailboxId, metadata });
}

export const actions: Actions = {
	create: async ({ locals, request }) => {
		const user = requirePermission(locals.user, 'mail.admin');
		const form = await request.formData();

		const parsed = mailboxAddress(readText(form, 'localPart'), mailDomain());
		if (!parsed.ok) return fail(400, { message: parsed.reason });

		const personal = readText(form, 'kind') === 'PERSONAL';
		const ownerId = personal ? readText(form, 'ownerId') : '';
		const displayName = readText(form, 'displayName');
		if (displayName === '')
			return fail(400, {
				message: 'Donnez un nom d’affichage : c’est ce que lisent les destinataires.'
			});
		if (personal && ownerId === '')
			return fail(400, { message: 'Une boîte personnelle a un titulaire.' });

		const taken = await prisma.mailbox.findUnique({
			where: { address: parsed.address },
			select: { id: true }
		});
		if (taken) return fail(400, { message: `« ${parsed.address} » existe déjà.` });

		const catchAll = !personal && readCheckbox(form, 'isCatchAll');

		const mailbox = await prisma.$transaction(async (tx) => {
			if (catchAll) await tx.mailbox.updateMany({ data: { isCatchAll: false } });
			return tx.mailbox.create({
				data: {
					address: parsed.address,
					displayName,
					kind: personal ? 'PERSONAL' : 'SHARED',
					ownerId: personal ? ownerId : null,
					isCatchAll: catchAll,
					// Le createur d'une boite partagee en est membre d'office : sinon
					// il la cree et ne la voit pas dans sa messagerie.
					members: personal ? undefined : { create: { userId: user.id } }
				}
			});
		});

		await audit(user.id, 'mailbox.create', mailbox.id, {
			address: mailbox.address,
			kind: mailbox.kind
		});
		return { message: `Boîte ${mailbox.address} créée.` };
	},

	update: async ({ locals, request }) => {
		const user = requirePermission(locals.user, 'mail.admin');
		const form = await request.formData();
		const id = readText(form, 'id');

		const mailbox = await prisma.mailbox.findUnique({ where: { id } });
		if (!mailbox) return fail(404, { message: 'Boîte introuvable.' });

		const displayName = readText(form, 'displayName');
		if (displayName === '') return fail(400, { message: 'Le nom d’affichage est obligatoire.' });

		const catchAll = mailbox.kind === 'SHARED' && readCheckbox(form, 'isCatchAll');
		const signature = String(form.get('signature') ?? '').trim();

		await prisma.$transaction(async (tx) => {
			if (catchAll && !mailbox.isCatchAll)
				await tx.mailbox.updateMany({ data: { isCatchAll: false } });
			await tx.mailbox.update({
				where: { id },
				data: { displayName, signature: signature === '' ? null : signature, isCatchAll: catchAll }
			});
		});

		await audit(user.id, 'mailbox.update', id, { address: mailbox.address, isCatchAll: catchAll });
		return { message: `Boîte ${mailbox.address} mise à jour.` };
	},

	addMember: async ({ locals, request }) => {
		const user = requirePermission(locals.user, 'mail.admin');
		const form = await request.formData();
		const mailboxId = readText(form, 'mailboxId');
		const userId = readText(form, 'userId');

		const mailbox = await prisma.mailbox.findUnique({ where: { id: mailboxId } });
		if (!mailbox || mailbox.kind !== 'SHARED')
			return fail(400, { message: 'Seule une boîte partagée a des membres.' });

		const member = await prisma.user.findUnique({
			where: { id: userId },
			select: { displayName: true }
		});
		if (!member) return fail(404, { message: 'Compte introuvable.' });

		await prisma.mailboxMember.upsert({
			where: { mailboxId_userId: { mailboxId, userId } },
			create: { mailboxId, userId },
			update: {}
		});

		await audit(user.id, 'mailbox.addMember', mailboxId, { address: mailbox.address, userId });
		return { message: `${member.displayName} lit désormais ${mailbox.address}.` };
	},

	removeMember: async ({ locals, request }) => {
		const user = requirePermission(locals.user, 'mail.admin');
		const form = await request.formData();
		const mailboxId = readText(form, 'mailboxId');
		const userId = readText(form, 'userId');

		const { count } = await prisma.mailboxMember.deleteMany({ where: { mailboxId, userId } });
		if (count === 0) return fail(404, { message: 'Ce compte n’était pas membre de la boîte.' });

		await audit(user.id, 'mailbox.removeMember', mailboxId, { userId });
		return { message: 'Membre retiré.' };
	},

	delete: async ({ locals, request }) => {
		const user = requirePermission(locals.user, 'mail.admin');
		const form = await request.formData();
		const id = readText(form, 'id');

		const mailbox = await prisma.mailbox.findUnique({ where: { id } });
		if (!mailbox) return fail(404, { message: 'Boîte introuvable.' });

		// Les fils d'abord, par `deleteThreads`, pour que les fichiers joints
		// quittent aussi le stockage ; la cascade de la base ne les verrait pas.
		const threads = await deleteThreads({ mailboxId: id });
		await prisma.mailbox.delete({ where: { id } });

		await audit(user.id, 'mailbox.delete', id, { address: mailbox.address, threads });
		return {
			message: `Boîte ${mailbox.address} supprimée, avec ${threads} fil${threads > 1 ? 's' : ''}.`
		};
	}
};
