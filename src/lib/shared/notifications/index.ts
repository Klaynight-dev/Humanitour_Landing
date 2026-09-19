import { text, type NotificationType } from './types';

/**
 * Registre des notifications.
 *
 * Chaque entree tient en quelques lignes : une cle, la permission deja
 * existante qui conditionne sa lecture, et la facon de l ecrire en francais.
 */
const surveyPublished: NotificationType = {
	key: 'survey.published',
	label: 'Sondage publié',
	requiredPermission: 'survey.read',
	render: (data) => ({
		title: 'Sondage publié',
		description: `« ${text(data, 'title', 'Une enquête')} » est désormais public.`,
		href: `/admin/sondages/${text(data, 'surveyId')}`
	})
};

const surveyUnpublished: NotificationType = {
	key: 'survey.unpublished',
	label: 'Sondage dépublié',
	requiredPermission: 'survey.read',
	render: (data) => ({
		title: 'Sondage dépublié',
		description: `« ${text(data, 'title', 'Une enquête')} » est repassée en brouillon.`,
		href: `/admin/sondages/${text(data, 'surveyId')}`
	})
};

const importCommitted: NotificationType = {
	key: 'import.committed',
	label: 'Import validé',
	requiredPermission: 'survey.read',
	render: (data) => ({
		title: 'Réponses importées',
		description: `${text(data, 'accepted', '0')} réponse(s) ajoutée(s) à « ${text(data, 'title', 'une enquête')} ».`,
		href: `/admin/sondages/${text(data, 'surveyId')}/import`
	})
};

const mediaPublished: NotificationType = {
	key: 'media.published',
	label: 'Média publié',
	requiredPermission: 'media.read',
	render: (data) => ({
		title: 'Média en ligne',
		description: `« ${text(data, 'title', 'Un média')} » est publié.`,
		href: `/admin/medias/${text(data, 'mediaId')}`
	})
};

const contentPublished: NotificationType = {
	key: 'content.published',
	label: 'Page publiée',
	requiredPermission: 'content.read',
	render: (data) => ({
		title: 'Page du site mise à jour',
		description: `La page « ${text(data, 'label', 'du site')} » affiche une nouvelle version.`,
		href: `/admin/contenu/${text(data, 'key', '').toLowerCase()}`
	})
};

const invitationAccepted: NotificationType = {
	key: 'invitation.accepted',
	label: 'Invitation acceptée',
	requiredPermission: 'user.read',
	render: (data) => ({
		title: 'Nouveau membre',
		description: `${text(data, 'displayName', 'Quelqu’un')} a rejoint l’équipe.`,
		href: '/admin/equipe'
	})
};

const REGISTERED: readonly NotificationType[] = [
	surveyPublished,
	surveyUnpublished,
	importCommitted,
	mediaPublished,
	contentPublished,
	invitationAccepted
];

const BY_KEY = new Map(REGISTERED.map((type) => [type.key, type]));

export const NOTIFICATION_TYPES = REGISTERED;

export function getNotificationType(key: string): NotificationType | null {
	return BY_KEY.get(key) ?? null;
}

export * from './types';
