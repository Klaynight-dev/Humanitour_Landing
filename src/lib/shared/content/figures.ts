import { parseDeclaredFields, type ContentBlockType, type ContentField } from './types';

/**
 * Chiffres mis en avant.
 *
 * Quatre emplacements fixes plutot qu une liste de longueur libre : la maquette
 * en aligne quatre, et un cinquieme casserait la rangee. Un emplacement vide ne
 * s affiche pas.
 *
 * Chaque chiffre porte son libelle : un nombre sans ce qu il compte n est pas
 * une information, c est une decoration.
 */
const FIELDS: readonly ContentField[] = [
	{ name: 'title', label: 'Titre de la section', type: 'text', required: false },
	{ name: 'value1', label: 'Chiffre 1', type: 'text', required: true },
	{ name: 'label1', label: 'Ce que compte le chiffre 1', type: 'text', required: true },
	{ name: 'value2', label: 'Chiffre 2', type: 'text', required: false },
	{ name: 'label2', label: 'Ce que compte le chiffre 2', type: 'text', required: false },
	{ name: 'value3', label: 'Chiffre 3', type: 'text', required: false },
	{ name: 'label3', label: 'Ce que compte le chiffre 3', type: 'text', required: false },
	{ name: 'value4', label: 'Chiffre 4', type: 'text', required: false },
	{ name: 'label4', label: 'Ce que compte le chiffre 4', type: 'text', required: false }
];

export const figuresType: ContentBlockType = {
	key: 'figures',
	label: 'Chiffres',
	description: 'Jusqu’à quatre chiffres clés, chacun avec ce qu’il compte.',
	fields: FIELDS,

	parseData(raw) {
		const result = parseDeclaredFields(FIELDS, raw);
		if (!result.ok) return result;

		// Un chiffre sans libelle ne se publie pas : c est la regle editoriale du
		// projet, un nombre voyage toujours avec ce qu il mesure.
		for (const index of [2, 3, 4]) {
			const value = result.data[`value${index}`];
			const label = result.data[`label${index}`];
			if (value !== undefined && label === undefined) {
				return { ok: false, reason: `Le chiffre ${index} n’a pas de libellé.` };
			}
			if (label !== undefined && value === undefined) {
				return { ok: false, reason: `Le libellé ${index} n’a pas de chiffre.` };
			}
		}

		return result;
	}
};
