import type { Component } from 'svelte';
import CheckboxField from './CheckboxField.svelte';
import CheckboxGridField from './CheckboxGridField.svelte';
import DateField from './DateField.svelte';
import DateTimeField from './DateTimeField.svelte';
import GridField from './GridField.svelte';
import NumberField from './NumberField.svelte';
import ParagraphField from './ParagraphField.svelte';
import RadioField from './RadioField.svelte';
import ScaleField from './ScaleField.svelte';
import SectionField from './SectionField.svelte';
import SelectField from './SelectField.svelte';
import TextBlockField from './TextBlockField.svelte';
import TextField from './TextField.svelte';
import type { FieldProps } from './contract';

/**
 * Registre des widgets, pendant visuel du registre de comportements
 * (`src/lib/shared/openforms/fields/`).
 *
 * Deux registres et non un seul, parce que `shared/` est isomorphe et testable
 * a 90 % : y importer des composants Svelte y ferait entrer du rendu, qu'on ne
 * teste pas (AGENTS.md section 3.2). Ce qui rend la separation SURE n'est pas
 * la discipline, c'est `widgets.test.ts` : il echoue des qu'une cle existe d'un
 * cote sans exister de l'autre.
 *
 * Les types exclus (courriel, fichier, signature, adresse, paiement) n'ont
 * volontairement AUCUN widget : ils ne sont jamais rendus, et l'absence
 * d'entree ici est la garantie qu'un oubli ne les affichera pas par accident.
 */

export interface FieldWidget {
	/** Meme cle que dans le registre de comportements. */
	readonly key: string;
	readonly component: Component<FieldProps>;
	/**
	 * Le widget pose-t-il PLUSIEURS controles ?
	 *
	 * Un groupe de boutons radio ne peut pas etre etiquete par `<label for>` :
	 * il faut `<fieldset><legend>`, sinon le libelle ne designe que le premier
	 * bouton. C'est declare ici plutot que devine dans le rendu.
	 */
	readonly grouped: boolean;
	/**
	 * Le widget rend-il son propre titre ?
	 *
	 * Vrai pour les blocs de mise en page, qui ne sont pas des champs : leur
	 * poser un libelle et un asterisque d'obligation n'aurait aucun sens.
	 */
	readonly standalone: boolean;
}

const REGISTERED: readonly FieldWidget[] = [
	{ key: 'short_text', component: TextField, grouped: false, standalone: false },
	{ key: 'paragraph', component: ParagraphField, grouped: false, standalone: false },
	{ key: 'number', component: NumberField, grouped: false, standalone: false },
	{ key: 'radio', component: RadioField, grouped: true, standalone: false },
	{ key: 'select', component: SelectField, grouped: false, standalone: false },
	{ key: 'checkbox', component: CheckboxField, grouped: true, standalone: false },
	{ key: 'linear_scale', component: ScaleField, grouped: true, standalone: false },
	{ key: 'date', component: DateField, grouped: false, standalone: false },
	{ key: 'datetime', component: DateTimeField, grouped: false, standalone: false },
	{ key: 'grid', component: GridField, grouped: true, standalone: false },
	{ key: 'checkbox_grid', component: CheckboxGridField, grouped: true, standalone: false },
	{ key: 'section', component: SectionField, grouped: false, standalone: true },
	{ key: 'text_block', component: TextBlockField, grouped: false, standalone: true }
];

export const FIELD_WIDGETS = REGISTERED;

/** Le widget d'un type, ou `null` s'il ne doit pas etre rendu. */
export function getFieldWidget(key: string): FieldWidget | null {
	return REGISTERED.find((widget) => widget.key === key) ?? null;
}
