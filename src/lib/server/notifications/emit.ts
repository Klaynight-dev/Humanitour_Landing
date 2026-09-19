import { prisma } from '$lib/server/db';
import { getNotificationType } from '$lib/shared/notifications';

/**
 * Emission d'une notification.
 *
 * Appelee aux memes endroits que `recordAudit`, et avec le meme filet : une
 * notification perdue est regrettable, faire echouer la publication parce que
 * la notification n'a pas pu s'ecrire serait absurde (voir server/audit.ts).
 */
export interface NotificationInput {
	readonly type: string;
	readonly entity: string;
	readonly entityId?: string | null;
	readonly actorId: string | null;
	readonly data?: Record<string, unknown>;
}

export async function notify(input: NotificationInput): Promise<void> {
	try {
		// Un type absent du registre ne serait affichable par personne : autant ne
		// pas l'ecrire, et le dire dans les journaux du serveur.
		if (!getNotificationType(input.type)) {
			console.error('[notifications] type inconnu', input.type);
			return;
		}

		await prisma.notification.create({
			data: {
				type: input.type,
				entity: input.entity,
				entityId: input.entityId ?? null,
				actorId: input.actorId,
				data: (input.data ?? {}) as never
			}
		});
	} catch (error) {
		console.error('[notifications] ecriture impossible', input.type, error);
	}
}
