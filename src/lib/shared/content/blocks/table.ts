import { defineBlockType } from '../types';
import { highlightFields, spacingField, surfaceField, titleField } from './common';

/**
 * Un tableau de comparaison a trois colonnes.
 *
 * Trois colonnes et pas un nombre libre : le tableau du site compare deux
 * valeurs pour une meme entree — ce qui se dit a la tele, ce que le terrain a
 * donne. Un constructeur de tableaux arbitraires produirait des grilles illisibles
 * sur telephone, ou personne ne verifierait plus le contraste ni l'entete.
 *
 * La legende n'est pas decorative : elle est lue par les lecteurs d'ecran a la
 * place du tableau entier, et c'est elle qui dit de quoi il parle.
 *
 * Deux textes sous le tableau, et ils ne se confondent pas. Le COMMENTAIRE dit
 * ce que les chiffres montrent ; la NOTE dit d'ou ils viennent. Les fondre en
 * un seul champ ferait glisser l'analyse dans la provenance, et un lecteur qui
 * cherche la source la trouverait noyee dans une interpretation — exactement ce
 * qu'on reproche aux autres (AGENTS.md section 0).
 */
export const tableType = defineBlockType({
	key: 'table',
	label: 'Tableau de comparaison',
	description: 'Une entrée, deux valeurs à comparer, et la seconde mise en avant.',
	group: 'listes',

	fields: [
		titleField(),
		...highlightFields(),
		{
			name: 'caption',
			label: 'Légende du tableau',
			help: 'Ce que le tableau compare. Lue par les lecteurs d’écran, invisible à l’écran.',
			type: 'textarea',
			required: true
		},
		{ name: 'column1', label: 'En-tête de la 1re colonne', type: 'text', required: true },
		{ name: 'column2', label: 'En-tête de la 2e colonne', type: 'text', required: true },
		{ name: 'column3', label: 'En-tête de la 3e colonne', type: 'text', required: true },
		{
			name: 'rows',
			label: 'Lignes',
			type: 'list',
			required: true,
			itemLabel: 'une ligne',
			item: [
				{ name: 'entry', label: 'Entrée', type: 'text', required: true },
				{
					name: 'detail',
					label: 'Précision sous l’entrée',
					help: 'Une année, un lieu. Facultatif.',
					type: 'text',
					required: false
				},
				{ name: 'value1', label: 'Valeur, 2e colonne', type: 'text', required: true },
				{ name: 'value2', label: 'Valeur, 3e colonne', type: 'text', required: true }
			]
		},
		{
			name: 'comment',
			label: 'Commentaire sous le tableau',
			help: 'Ce que le tableau montre, en une ou deux phrases. Distinct de la note, qui dit d’où viennent les chiffres.',
			type: 'textarea',
			required: false
		},
		{
			name: 'note',
			label: 'Note sous le tableau',
			help: 'D’où viennent ces chiffres. Un chiffre sans source ne se publie pas.',
			type: 'textarea',
			required: false
		},
		surfaceField('ink'),
		spacingField()
	],

	starter: {
		caption: 'Ce que le tableau compare.',
		column1: 'Entrée',
		column2: 'Annoncé',
		column3: 'Constaté',
		rows: [{ entry: 'Une entrée', value1: '10 %', value2: '12 %' }],
		surface: 'ink',
		spacing: 'normal'
	}
});
