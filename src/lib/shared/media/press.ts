import { readString, type MediaType } from './types';

/**
 * Reprise de presse : un article paru ailleurs qui parle d Humanitour.
 *
 * On ne recopie pas le texte, on renvoie a la source. Le nom du media est
 * obligatoire : un lien sans sa provenance oblige le lecteur a cliquer pour
 * savoir qui parle.
 */
export const pressType: MediaType = {
	key: 'PRESS',
	label: 'Revue de presse',
	plural: 'Revue de presse',
	description: "Un article paru dans un autre media, avec un lien vers la source.",
	hasBody: false,
	isOutbound: true,
	fields: [
		{ name: 'sourceName', label: 'Nom du media', type: 'text', required: true },
		{ name: 'sourceUrl', label: "Adresse de l'article", type: 'url', required: true },
		{ name: 'author', label: "Signature de l'article", type: 'text', required: false }
	],

	parseData(raw) {
		const sourceName = readString(raw, 'sourceName');
		if (!sourceName) return { ok: false, reason: 'Le nom du media source est obligatoire.' };

		const sourceUrl = readString(raw, 'sourceUrl');
		if (!sourceUrl) return { ok: false, reason: "L'adresse de l'article est obligatoire." };

		if (!sourceUrl.startsWith('https://') && !sourceUrl.startsWith('http://')) {
			return { ok: false, reason: "L'adresse de l'article doit commencer par http:// ou https://." };
		}

		const author = readString(raw, 'author');

		return { ok: true, data: { sourceName, sourceUrl, ...(author ? { author } : {}) } };
	}
};
