import { requireMailbox } from '$lib/server/mail/access';
import { subscribeMailbox } from '$lib/server/mail/live';
import type { RequestHandler } from './$types';

/**
 * Flux d'evenements (Server-Sent Events) d'une boite : l'ecran ouvert est
 * prevenu des qu'un courriel arrive ou qu'un statut change, sans recharger.
 *
 * SSE plutot qu'un WebSocket : le sens est unique (serveur vers ecran), le flux
 * traverse les mandataires HTTP tel quel et se reconnecte tout seul, et il ne
 * demande aucun serveur a part du gestionnaire de routes.
 *
 * Meme controle d'acces que le reste de la messagerie : une boite hors de
 * portee rend 404.
 */

/** Un commentaire toutes les 25 s garde la connexion ouverte a travers les mandataires. */
const HEARTBEAT_MS = 25_000;

export const GET: RequestHandler = async ({ locals, params, request }) => {
	const { mailbox } = await requireMailbox(locals.user, params.boite);

	const encoder = new TextEncoder();
	let cleanup = () => {};

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			const send = (chunk: string) => {
				try {
					controller.enqueue(encoder.encode(chunk));
				} catch {
					cleanup();
				}
			};

			const unsubscribe = subscribeMailbox(mailbox.id, () => send('event: mail\ndata: 1\n\n'));
			const heartbeat = setInterval(() => send(': ping\n\n'), HEARTBEAT_MS);

			cleanup = () => {
				clearInterval(heartbeat);
				unsubscribe();
				try {
					controller.close();
				} catch {
					/* deja ferme */
				}
			};

			request.signal.addEventListener('abort', cleanup);
			send('retry: 3000\n: connecte\n\n');
		},
		cancel() {
			cleanup();
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream; charset=utf-8',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
			// Nginx et consorts ne doivent pas mettre le flux en tampon.
			'X-Accel-Buffering': 'no'
		}
	});
};
