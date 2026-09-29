/**
 * Les dates de la messagerie, a l'heure de Paris.
 *
 * Dans une liste, l'heure suffit pour un message du jour ; au-dela, le jour et
 * le mois ; l'annee n'apparait que si elle n'est pas l'annee en cours. C'est
 * ce que font les messageries courantes, et ce que l'oeil sait lire vite.
 */

const ZONE = 'Europe/Paris';

const DAY = new Intl.DateTimeFormat('fr-FR', {
	timeZone: ZONE,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit'
});
const TIME = new Intl.DateTimeFormat('fr-FR', {
	timeZone: ZONE,
	hour: '2-digit',
	minute: '2-digit'
});
const DAY_MONTH = new Intl.DateTimeFormat('fr-FR', {
	timeZone: ZONE,
	day: 'numeric',
	month: 'short'
});
const FULL = new Intl.DateTimeFormat('fr-FR', {
	timeZone: ZONE,
	day: 'numeric',
	month: 'short',
	year: 'numeric'
});
const LONG = new Intl.DateTimeFormat('fr-FR', {
	timeZone: ZONE,
	dateStyle: 'full',
	timeStyle: 'short'
});

function year(date: Date): string {
	return new Intl.DateTimeFormat('fr-FR', { timeZone: ZONE, year: 'numeric' }).format(date);
}

export function formatListDate(value: Date | string, now: Date = new Date()): string {
	const date = new Date(value);
	if (DAY.format(date) === DAY.format(now)) return TIME.format(date);
	if (year(date) === year(now)) return DAY_MONTH.format(date);
	return FULL.format(date);
}

/** La date complete, dans l'en-tete d'un message ouvert. */
export function formatMessageDate(value: Date | string): string {
	return LONG.format(new Date(value));
}
