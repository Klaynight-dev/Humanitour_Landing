import { checkbox } from './checkbox';
import { radio, select } from './choice';
import { date, datetime } from './date';
import { address, email, file, signature, stripePayment } from './excluded';
import { checkboxGrid, grid } from './grid';
import { linearScale } from './linear-scale';
import { number } from './number';
import { section, textBlock } from './presentational';
import { paragraph, shortText } from './text';
import type { FieldTypeDefinition } from '../types';

/**
 * Registre des types de champ Openforms.
 *
 * Ajouter un type : ecrire son comportement dans `fields/`, l'ajouter a cette
 * liste. Rien d'autre ne change — ni le rendu, ni l'envoi, ni la
 * synchronisation, qui interrogent tous ce registre.
 *
 * La liste couvre les dix-huit types du builder Openforms
 * (`backend/src/lib/formSchema.ts`). Un type qui apparaitrait chez lui sans
 * apparaitre ici est traite comme inconnu, et signale : voir `requireFieldType`.
 */
const REGISTERED: readonly FieldTypeDefinition[] = [
	shortText,
	paragraph,
	number,
	radio,
	select,
	checkbox,
	linearScale,
	date,
	datetime,
	grid,
	checkboxGrid,
	section,
	textBlock,
	email,
	file,
	signature,
	address,
	stripePayment
];

export const FIELD_TYPES = REGISTERED;

export function getFieldType(key: string): FieldTypeDefinition | null {
	return REGISTERED.find((type) => type.key === key) ?? null;
}

/**
 * Le type, ou une erreur nommant la cle inconnue.
 *
 * Openforms peut gagner un type de champ sans que ce depot le sache. Mieux vaut
 * echouer bruyamment sur la cle exacte que rendre un champ vide : le second cas
 * enverrait une reponse amputee sans que personne ne s'en apercoive.
 */
export function requireFieldType(key: string): FieldTypeDefinition {
	const type = getFieldType(key);
	if (type) return type;
	throw new Error(`Type de champ Openforms inconnu : « ${key} ».`);
}
