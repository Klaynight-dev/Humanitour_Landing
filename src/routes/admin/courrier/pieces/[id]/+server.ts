import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { requireMailbox } from '$lib/server/mail/access';
import { storage } from '$lib/server/storage';
import { isSafeInline } from '$lib/shared/mail/attachments';
import type { RequestHandler } from './$types';

/**
 * Une piece jointe, pour qui peut lire sa boite.
 *
 * Le fichier vient d'un inconnu. Servi depuis l'origine du site, un HTML ou un
 * SVG s'executerait avec la session du membre qui l'ouvre : tout ce qui n'est
 * pas une image matricielle part donc en telechargement, et la politique
 * `sandbox` interdit le script meme a ce qui s'afficherait quand meme.
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	const attachment = await prisma.mailAttachment.findUnique({
		where: { id: params.id },
		include: { message: { select: { mailboxId: true } } }
	});
	if (!attachment) error(404, 'Pièce jointe introuvable.');

	// 404 aussi quand la boite n'est pas lisible : ne pas confirmer l'existence.
	await requireMailbox(locals.user, attachment.message.mailboxId);

	const bytes = await storage()
		.get(attachment.storageKey)
		.catch(() => null);
	if (bytes === null) error(404, 'Le fichier de cette pièce jointe a disparu du stockage.');

	const inline = isSafeInline(attachment.contentType);
	const name = encodeURIComponent(attachment.filename);

	return new Response(bytes as BodyInit, {
		headers: {
			'content-type': inline ? attachment.contentType : 'application/octet-stream',
			'content-length': String(bytes.byteLength),
			'content-disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${name}`,
			'content-security-policy': "sandbox; default-src 'none'; img-src 'self'",
			'cache-control': 'private, no-store'
		}
	});
};
