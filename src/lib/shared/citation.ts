import { formatCount, formatDate } from './format';
import { LICENSES, SITE } from './site';

/**
 * De quoi citer un resultat, et de quoi le reprendre en code.
 *
 * C est le bloc qu Our World in Data place sous chaque graphique, et c est ce
 * qui separe un site qui publie des chiffres d un site qu on peut CITER : sans
 * citation prete a coller, un journaliste recopie a la main, se trompe de base,
 * et le chiffre circule sans ce qui le rend verifiable.
 *
 * Les gabarits de phrase sont ecrits ici, a la main, une fois. Seules les
 * valeurs sont interpolees : rien dans ce fichier n est de la prose produite
 * par une machine (AGENTS.md section 5).
 */

export interface CitationContext {
	readonly surveyTitle: string;
	readonly questionLabel: string;
	/** Libelle de la question croisee, s il y en a une. */
	readonly crossedWithLabel: string | null;
	/** Repondants. `null` quand le seuil d anonymat interdit de le publier. */
	readonly base: number | null;
	/** Restrictions de population, deja mises en libelles lisibles. */
	readonly filters: readonly string[];
	readonly fieldwork: string;
	readonly pageUrl: string;
	readonly apiUrl: string;
	readonly consultedOn: Date;
}

/** La ligne qu on colle sous un graphique repris dans un article. */
export function shortCitation(context: CitationContext): string {
	const base = context.base === null ? '' : `, n = ${formatCount(context.base)}`;

	return `${SITE.name}, « ${context.surveyTitle} »${base} (${LICENSES.data.name}).`;
}

/**
 * La citation complete, celle d une note de bas de page ou d une bibliographie.
 *
 * Elle porte le libelle EXACT de la question. La formulation fait partie du
 * resultat : c est le premier des reproches adresses aux instituts, et une
 * citation qui la perd laisse croire qu on a demande autre chose.
 */
export function longCitation(context: CitationContext): string {
	const parts = [
		`${SITE.name}, « ${context.surveyTitle} », question : « ${context.questionLabel} »`
	];

	if (context.crossedWithLabel) {
		parts.push(`croisée avec « ${context.crossedWithLabel} »`);
	}

	if (context.filters.length > 0) {
		parts.push(`population restreinte à : ${context.filters.join(' ; ')}`);
	}

	if (context.base !== null) {
		parts.push(`base : ${formatCount(context.base)} répondants`);
	}

	if (context.fieldwork) parts.push(context.fieldwork.toLocaleLowerCase('fr-FR'));

	parts.push(`effectifs bruts, sans pondération ni redressement`);
	parts.push(`${context.pageUrl} (consulté le ${formatDate(context.consultedOn)})`);
	parts.push(`diffusé sous ${LICENSES.data.name}`);

	return `${parts.join(', ')}.`;
}

export interface CodeExample {
	/** Cle stable, utilisee comme identifiant d onglet. */
	readonly key: string;
	readonly label: string;
	/** Langage, pour la coloration et pour l attribut `lang` du bloc. */
	readonly language: string;
	readonly code: string;
}

/**
 * Trois facons de rejouer le meme croisement depuis un carnet ou un terminal.
 *
 * Elles tapent l API publique sur l adresse EXACTE affichee a l ecran : ce qui
 * est lu dans le navigateur et ce qui est charge dans pandas sont le meme
 * comptage, pas deux extractions qui pourraient dater de deux moments.
 */
export function codeExamples(apiUrl: string): readonly CodeExample[] {
	return [
		{
			key: 'python',
			label: 'Python',
			language: 'python',
			code: `import pandas as pd
import requests

reponse = requests.get("${apiUrl}").json()
cellules = pd.DataFrame(reponse["resultat"]["cellules"])
print(reponse["population"])
print(cellules)`
		},
		{
			key: 'r',
			label: 'R',
			language: 'r',
			code: `library(jsonlite)

reponse <- fromJSON("${apiUrl}")
cellules <- reponse$resultat$cellules
head(cellules)`
		},
		{
			key: 'curl',
			label: 'curl',
			language: 'bash',
			code: `curl -s "${apiUrl}" | jq '.resultat.cellules'`
		}
	];
}
