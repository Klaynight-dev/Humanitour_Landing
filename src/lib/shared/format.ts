/**
 * Mise en forme des chiffres publies.
 *
 * Une seule implementation, utilisee partout. Deux formatages concurrents de la
 * meme part produiraient « 62 % » ici et « 61,5 % » la, sur la meme donnee.
 */

const COUNT_FORMAT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

const SHARE_FORMAT = new Intl.NumberFormat('fr-FR', {
	style: 'percent',
	minimumFractionDigits: 1,
	maximumFractionDigits: 1
});

const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', {
	day: 'numeric',
	month: 'long',
	year: 'numeric'
});

/** Texte affiche a la place d un chiffre masque par le seuil d anonymat. */
export const SUPPRESSED_LABEL = 'Effectif insuffisant';

/** Symbole compact, pour les cases de tableau ou le texte complet ne tient pas. */
export const SUPPRESSED_SYMBOL = '—';

export function formatCount(value: number | null): string {
	if (value === null) return SUPPRESSED_SYMBOL;
	return COUNT_FORMAT.format(value);
}

/**
 * Part en pourcentage.
 *
 * Une decimale : au-dela on suggere une precision que l echantillon n a pas ;
 * en-deca on ecrase des ecarts reels sur les petites modalites.
 */
export function formatShare(ratio: number | null): string {
	if (ratio === null) return SUPPRESSED_SYMBOL;
	return SHARE_FORMAT.format(ratio);
}

/**
 * Effectif annonce avec son libelle.
 *
 * Tout pourcentage publie doit voyager avec sa base : « 62,0 % » ne veut rien
 * dire sans savoir si c est sur 12 ou sur 1 200 personnes.
 */
export function formatBase(respondents: number): string {
	if (respondents === 0) return 'aucun répondant';
	if (respondents === 1) return 'base : 1 répondant';
	return `base : ${COUNT_FORMAT.format(respondents)} répondants`;
}

export function formatDate(value: Date | string | null): string {
	if (!value) return '';
	const date = typeof value === 'string' ? new Date(value) : value;
	if (Number.isNaN(date.getTime())) return '';
	return DATE_FORMAT.format(date);
}

/** Periode de terrain, telle qu affichee sous chaque resultat. */
export function formatFieldwork(start: Date | string | null, end: Date | string | null): string {
	const from = formatDate(start);
	const to = formatDate(end);

	if (from && to) return `Terrain du ${from} au ${to}`;
	if (from) return `Terrain depuis le ${from}`;
	if (to) return `Terrain jusqu'au ${to}`;
	return '';
}
