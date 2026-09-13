import { prisma } from './db';

/**
 * Journal d'audit.
 *
 * Un institut qui reproche l'opacite aux autres doit pouvoir dire qui a publie
 * quoi, et quand. Toute action du back-office qui modifie une donnee publiee
 * laisse une trace.
 *
 * L'ecriture ne fait JAMAIS echouer l'action auditee : perdre une ligne de
 * journal est regrettable, perdre la publication parce que le journal etait
 * indisponible serait absurde.
 */
export interface AuditInput {
	readonly actorId: string | null;
	/** Verbe normalise : survey.publish, import.commit, role.update, media.publish. */
	readonly action: string;
	readonly entity: string;
	readonly entityId?: string | null;
	readonly metadata?: Record<string, unknown>;
}

export async function recordAudit(input: AuditInput): Promise<void> {
	try {
		await prisma.auditEvent.create({
			data: {
				actorId: input.actorId,
				action: input.action,
				entity: input.entity,
				entityId: input.entityId ?? null,
				metadata: (input.metadata ?? {}) as never
			}
		});
	} catch (error) {
		console.error('[audit] ecriture impossible', input.action, error);
	}
}
