import { describe, expect, it } from 'vitest';
import { FIELD_TYPES, getFieldType, requireFieldType } from './fields';
import { parseSchema } from './parse';
import {
	blankValues,
	buildSubmission,
	isVisible,
	readFormValues,
	validateAll,
	visibleFields
} from './submission';
import { inspectForm } from './usability';
import type { OpenformsField, OpenformsForm } from './types';

/** Un champ minimal, que chaque test specialise. */
function field(partial: Partial<OpenformsField> & { key: string; type: string }): OpenformsField {
	return { label: partial.key, required: false, options: [], ...partial };
}

function form(fields: OpenformsField[]): OpenformsForm {
	return {
		id: 'f1',
		slug: 'enquete',
		title: 'Enquête',
		description: null,
		fields,
		requireConsent: true,
		consentText: null,
		privacyPolicyUrl: null
	};
}

const PRIORITE = field({
	key: 'priorite',
	type: 'radio',
	label: 'Quelle est votre priorité ?',
	required: true,
	options: [
		{ value: 'sante', label: 'La santé' },
		{ value: 'ecologie', label: "L'écologie" }
	]
});

describe('registre des types de champ', () => {
	it('expose des cles uniques', () => {
		const keys = FIELD_TYPES.map((type) => type.key);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('couvre les dix-huit types du builder Openforms', () => {
		// La liste vient de `backend/src/lib/formSchema.ts`. Si Openforms en
		// ajoute un, ce test reste vert mais `requireFieldType` echouera a la
		// liaison, ce qui est le comportement voulu : bruyant, pas silencieux.
		const expected = [
			'short_text',
			'paragraph',
			'email',
			'number',
			'radio',
			'checkbox',
			'select',
			'date',
			'datetime',
			'file',
			'grid',
			'linear_scale',
			'checkbox_grid',
			'section',
			'text_block',
			'signature',
			'address',
			'stripe_payment'
		];

		for (const key of expected) expect(getFieldType(key), key).not.toBeNull();
		expect(FIELD_TYPES).toHaveLength(expected.length);
	});

	it('echoue bruyamment sur un type inconnu', () => {
		expect(() => requireFieldType('hologramme')).toThrow(/hologramme/);
	});

	it('marque identifiants les quatre types a risque, et eux seuls', () => {
		const identifying = FIELD_TYPES.filter((type) => type.identifying).map((type) => type.key);
		expect(identifying.sort()).toEqual(['address', 'email', 'file', 'signature']);
	});
});

describe('parseSchema', () => {
	it('lit un champ complet', () => {
		const [parsed] = parseSchema([
			{
				key: 'priorite',
				type: 'radio',
				label: 'Priorité',
				required: true,
				options: [{ value: 'sante', label: 'La santé' }]
			}
		]);

		expect(parsed?.key).toBe('priorite');
		expect(parsed?.required).toBe(true);
		expect(parsed?.options).toEqual([{ value: 'sante', label: 'La santé', color: undefined }]);
	});

	it('accepte une option ecrite en chaine', () => {
		const [parsed] = parseSchema([{ key: 'q', type: 'radio', options: ['oui', 'non'] }]);
		expect(parsed?.options.map((option) => option.value)).toEqual(['oui', 'non']);
	});

	it('ecarte un champ sans cle exploitable', () => {
		// Fabriquer une cle de remplacement produirait un champ qui ne
		// correspondrait a rien a la soumission.
		expect(parseSchema([{ type: 'radio', label: 'Sans clé' }])).toHaveLength(0);
	});

	it('retombe sur la cle quand le libelle manque', () => {
		const [parsed] = parseSchema([{ key: 'age', type: 'number' }]);
		expect(parsed?.label).toBe('age');
	});

	it('rend une liste vide sur autre chose qu un tableau', () => {
		expect(parseSchema(null)).toHaveLength(0);
		expect(parseSchema({ champs: [] })).toHaveLength(0);
	});
});

describe('inspectForm', () => {
	it('sert un questionnaire dont tous les champs sont collectables', () => {
		const report = inspectForm(form([PRIORITE, field({ key: 'age', type: 'number' })]));

		expect(report.servable).toBe(true);
		expect(report.fields).toHaveLength(2);
		expect(report.removed).toHaveLength(0);
	});

	it('retire un champ identifiant facultatif, et le nomme', () => {
		const report = inspectForm(form([PRIORITE, field({ key: 'courriel', type: 'email' })]));

		expect(report.servable).toBe(true);
		expect(report.fields.map((entry) => entry.key)).toEqual(['priorite']);
		expect(report.removed).toHaveLength(1);
		expect(report.removed[0]?.reason).toMatch(/identifiante/i);
	});

	it('refuse le questionnaire entier si le champ identifiant est obligatoire', () => {
		// Le servir ampute produirait une soumission qu'Openforms refuserait, ou
		// pire, accepterait avec un courriel dedans.
		const report = inspectForm(
			form([PRIORITE, field({ key: 'courriel', type: 'email', required: true })])
		);

		expect(report.servable).toBe(false);
		expect(report.blockers).toHaveLength(1);
	});

	it('refuse un questionnaire portant un type inconnu', () => {
		const report = inspectForm(form([field({ key: 'x', type: 'hologramme' })]));

		expect(report.servable).toBe(false);
		expect(report.blockers[0]?.reason).toMatch(/inconnu/i);
	});
});

describe('visibilite conditionnelle', () => {
	const SUITE = field({
		key: 'pourquoi',
		type: 'short_text',
		condition: { fieldKey: 'priorite', value: 'sante' }
	});

	it('masque le champ tant que la condition n est pas remplie', () => {
		expect(isVisible(SUITE, { priorite: 'ecologie' })).toBe(false);
		expect(isVisible(SUITE, { priorite: 'sante' })).toBe(true);
	});

	it('considere une condition satisfaite par un choix multiple qui la contient', () => {
		expect(isVisible(SUITE, { priorite: ['ecologie', 'sante'] })).toBe(true);
	});

	it('masque le champ quand la question dont il depend est absente', () => {
		expect(isVisible(SUITE, {})).toBe(false);
	});

	it('affiche toujours un champ sans condition', () => {
		expect(isVisible(PRIORITE, {})).toBe(true);
	});

	it('ne valide pas un champ masque', () => {
		// Un champ qui n a pas ete pose ne peut pas manquer : le valider
		// bloquerait l envoi sur une question que le repondant n a jamais vue.
		const fields = [PRIORITE, { ...SUITE, required: true }];
		const errors = validateAll(fields, { priorite: 'ecologie', pourquoi: '' });

		expect(errors.pourquoi).toBeUndefined();
	});

	it('valide le champ des qu il apparait', () => {
		const fields = [PRIORITE, { ...SUITE, required: true }];
		const errors = validateAll(fields, { priorite: 'sante', pourquoi: '' });

		expect(errors.pourquoi).toBeDefined();
	});
});

describe('validation', () => {
	it('refuse une question obligatoire laissee vide', () => {
		expect(validateAll([PRIORITE], { priorite: '' }).priorite).toBeDefined();
	});

	it('accepte une question facultative laissee vide', () => {
		const optional = { ...PRIORITE, required: false };
		expect(validateAll([optional], { priorite: '' }).priorite).toBeUndefined();
	});

	it('refuse un choix absent des options declarees', () => {
		// Un formulaire poste a la main deposerait sinon une modalite inexistante,
		// qui apparaitrait telle quelle dans un resultat publie.
		expect(validateAll([PRIORITE], { priorite: 'monarchie' }).priorite).toMatch(/proposées/);
	});

	it('accepte une valeur libre quand « autre » est ouvert', () => {
		const withOther = { ...PRIORITE, allowOther: true };
		expect(validateAll([withOther], { priorite: 'la pêche' }).priorite).toBeUndefined();
	});

	it('applique les bornes numeriques', () => {
		const age = field({ key: 'age', type: 'number', validation: { min: 18, max: 120 } });

		expect(validateAll([age], { age: '17' }).age).toMatch(/minimum/);
		expect(validateAll([age], { age: '130' }).age).toMatch(/maximum/);
		expect(validateAll([age], { age: '42' }).age).toBeUndefined();
	});

	it('accepte la virgule decimale', () => {
		const note = field({ key: 'note', type: 'number' });
		expect(validateAll([note], { note: '3,5' }).note).toBeUndefined();
	});

	it('applique les bornes d une echelle, defauts compris', () => {
		const echelle = field({ key: 'confiance', type: 'linear_scale' });

		expect(validateAll([echelle], { confiance: '6' }).confiance).toMatch(/entre 1 et 5/);
		expect(validateAll([echelle], { confiance: '3' }).confiance).toBeUndefined();
	});

	it('ignore une expression reguliere invalide plutot que de bloquer', () => {
		// L'expression vient d'un operateur dans un autre logiciel : le repondant
		// ne peut pas corriger une faute de configuration.
		const code = field({ key: 'code', type: 'short_text', validation: { pattern: '([a-z' } });
		expect(validateAll([code], { code: 'quoi que ce soit' }).code).toBeUndefined();
	});

	it('refuse une date au mauvais format', () => {
		const jour = field({ key: 'jour', type: 'date', required: true });

		expect(validateAll([jour], { jour: '12/03/2026' }).jour).toMatch(/AAAA-MM-JJ/);
		expect(validateAll([jour], { jour: '2026-03-12' }).jour).toBeUndefined();
	});
});

describe('buildSubmission', () => {
	it('n envoie que les champs visibles et porteurs de reponse', () => {
		const fields = [
			PRIORITE,
			field({ key: 'titre', type: 'section' }),
			field({ key: 'pourquoi', type: 'short_text', condition: { fieldKey: 'priorite', value: 'sante' } })
		];

		const data = buildSubmission(fields, { priorite: 'ecologie', pourquoi: 'ignoré' });

		expect(data).toEqual({ priorite: 'ecologie' });
	});

	it('omet une valeur vide plutot que de l envoyer a vide', () => {
		// Openforms la compterait comme une saisie ; une question sans reponse est
		// une non-reponse, et c est la normalisation qui la comptera comme telle.
		const age = field({ key: 'age', type: 'number' });
		expect(buildSubmission([age], { age: '' })).toEqual({});
	});

	it('envoie un choix multiple en tableau', () => {
		const medias = field({
			key: 'medias',
			type: 'checkbox',
			options: [
				{ value: 'presse', label: 'Presse' },
				{ value: 'radio', label: 'Radio' }
			]
		});

		expect(buildSubmission([medias], { medias: ['presse', 'radio'] })).toEqual({
			medias: ['presse', 'radio']
		});
	});

	it('convertit un nombre, sans faire d un vide un zero', () => {
		const age = field({ key: 'age', type: 'number' });

		expect(buildSubmission([age], { age: '42' })).toEqual({ age: 42 });
		expect(buildSubmission([age], { age: '' })).toEqual({});
	});
});

describe('lecture d un envoi HTML', () => {
	it('relit un controle unique', () => {
		const body = new FormData();
		body.set('priorite', 'sante');

		expect(readFormValues([PRIORITE], body)).toEqual({ priorite: 'sante' });
	});

	it('relit toutes les cases d un choix multiple', () => {
		const medias = field({ key: 'medias', type: 'checkbox' });
		const body = new FormData();
		body.append('medias', 'presse');
		body.append('medias', 'radio');

		expect(readFormValues([medias], body)).toEqual({ medias: ['presse', 'radio'] });
	});

	it('relit une grille ligne par ligne', () => {
		const grille = field({
			key: 'confiance',
			type: 'grid',
			grid: { rows: ['Presse', 'Radio'], columns: ['Oui', 'Non'] }
		});

		const body = new FormData();
		body.set('confiance:Presse', 'Non');
		body.set('confiance:Radio', 'Oui');

		expect(readFormValues([grille], body)).toEqual({
			confiance: { Presse: 'Non', Radio: 'Oui' }
		});
	});

	it('rend un vide pour un champ absent de l envoi', () => {
		expect(readFormValues([PRIORITE], new FormData())).toEqual({ priorite: '' });
	});
});

describe('blankValues et visibleFields', () => {
	it('n initialise que les champs porteurs de reponse', () => {
		const fields = [PRIORITE, field({ key: 'intro', type: 'text_block' })];
		expect(Object.keys(blankValues(fields))).toEqual(['priorite']);
	});

	it('donne un tableau vide a un choix multiple, une chaine ailleurs', () => {
		const medias = field({ key: 'medias', type: 'checkbox' });
		expect(blankValues([PRIORITE, medias])).toEqual({ priorite: '', medias: [] });
	});

	it('initialise une grille avec une entree par ligne', () => {
		const grille = field({
			key: 'g',
			type: 'grid',
			grid: { rows: ['A', 'B'], columns: ['1'] }
		});

		expect(blankValues([grille])).toEqual({ g: { A: '', B: '' } });
	});

	it('conserve l ordre du questionnaire', () => {
		const fields = [PRIORITE, field({ key: 'age', type: 'number' })];
		expect(visibleFields(fields, {}).map((entry) => entry.key)).toEqual(['priorite', 'age']);
	});
});

describe('aplatissement pour la synchronisation', () => {
	it('rend un choix multiple en liste separee par des points-virgules', () => {
		expect(requireFieldType('checkbox').toCell(['presse', 'radio'])).toBe('presse; radio');
	});

	it('rend une grille en « ligne = reponse », lisible dans un tableur', () => {
		expect(requireFieldType('grid').toCell({ Presse: 'Non', Radio: 'Oui' })).toBe(
			'Presse = Non ; Radio = Oui'
		);
	});

	it('laisse une valeur simple intacte', () => {
		expect(requireFieldType('short_text').toCell('la santé')).toBe('la santé');
		expect(requireFieldType('number').toCell(42)).toBe(42);
	});

	it('ne rend rien pour un champ qui ne porte pas de reponse', () => {
		expect(requireFieldType('section').toCell('quoi que ce soit')).toBeUndefined();
		expect(requireFieldType('email').toCell('a@b.fr')).toBeUndefined();
	});
});
