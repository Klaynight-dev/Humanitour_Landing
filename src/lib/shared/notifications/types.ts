import type { Permission } from '$lib/shared/permissions';

/**
 * Contrat du registre des notifications.
 *
 * Ajouter un type de notification = ajouter un fichier et l enregistrer dans
 * `index.ts`. Aucun `switch` ailleurs, aucune colonne en base.
 *
 * La visibilite n est PAS une nouvelle permission : chaque type declare celle
 * qui existe deja pour lire l objet concerne. Une notification ne doit jamais
 * reveler qu une chose s est passee sur un objet que le compte ne peut pas
 * ouvrir.
 */

export interface NotificationView {
	readonly title: string;
	readonly description: string;
	/** Ou mene la notification. Une notification qui ne mene nulle part est un bruit. */
	readonly href: string;
}

export interface NotificationType {
	/** Valeur stockee dans `Notification.type`. Contrat : jamais renommee. */
	readonly key: string;
	readonly label: string;
	readonly requiredPermission: Permission;

	render(data: Record<string, unknown>): NotificationView;
}

/** Lit une chaine dans les donnees libres d une notification. */
export function text(data: Record<string, unknown>, key: string, fallback = ''): string {
	const value = data[key];
	return typeof value === 'string' && value.trim() !== '' ? value : fallback;
}
