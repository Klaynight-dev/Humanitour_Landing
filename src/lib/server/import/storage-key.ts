import { safeKeySegment } from '../storage';

/**
 * Emplacement du fichier d origine d un lot d import.
 *
 * Le fichier depose fait foi si un resultat est conteste : il survit a l import
 * et n est efface que lorsque le lot, ou l enquete entiere, disparait. Cette
 * disposition est donc lue par deux appelants au moins, et une seconde
 * implementation qui divergerait laisserait des fichiers orphelins que plus
 * rien ne saurait retrouver.
 */
export function importFileKey(surveyId: string, batchId: string, filename: string): string {
	return `imports/${surveyId}/${batchId}-${safeKeySegment(filename)}`;
}
