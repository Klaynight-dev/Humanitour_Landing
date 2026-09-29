import { prisma } from '$lib/server/db';
import { storage } from '$lib/server/storage';

/**
 * Suppression definitive de fils, pieces jointes comprises.
 *
 * La base efface les messages et leurs pieces jointes en cascade, mais pas les
 * fichiers du stockage. Un meme fichier peut servir a plusieurs lignes (un
 * courriel recu par deux boites, un transfert qui reprend une piece jointe) :
 * il n'est retire que lorsque plus aucune ligne ne le reference.
 */
export async function deleteThreads(where: {
	mailboxId: string;
	id?: { in: string[] };
	folder?: 'TRASH';
}): Promise<number> {
	const attachments = await prisma.mailAttachment.findMany({
		where: { message: { thread: where } },
		select: { storageKey: true }
	});

	const { count } = await prisma.mailThread.deleteMany({ where });

	const keys = [...new Set(attachments.map((attachment) => attachment.storageKey))];
	const stillUsed = await prisma.mailAttachment.findMany({
		where: { storageKey: { in: keys } },
		select: { storageKey: true }
	});
	const orphans = keys.filter((key) => !stillUsed.some((row) => row.storageKey === key));

	await Promise.all(
		orphans.map((key) =>
			storage()
				.remove(key)
				.catch(() => undefined)
		)
	);
	return count;
}
