import type { SubmitFunction } from '@sveltejs/kit';

/**
 * Soumettre, puis refermer la fenetre.
 *
 * `use:enhance` sans rappel applique bien le resultat et recharge les donnees
 * de la page — mais il ne sait rien de l'etat local qui tient la fenetre
 * ouverte. Les quatre fenetres de confirmation du back-office restaient donc
 * affichees apres coup, par-dessus une liste pourtant deja a jour : de l'autre
 * cote de l'ecran, rien ne semblait s'etre passe.
 *
 * L'ordre compte. La fermeture vient APRES `update()`, pas avant : refermer
 * d'abord donnerait a voir l'ancienne liste pendant l'aller-retour, et la ligne
 * supprimee clignoterait avant de disparaitre.
 */
export function closeAfter(close: () => void): SubmitFunction {
	return () =>
		async ({ update }) => {
			await update();
			close();
		};
}
