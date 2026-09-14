import { resolveEmbed } from './embed';
import { readPositiveInt, readString, type MediaType } from './types';

/**
 * Video ou reportage heberge ailleurs.
 *
 * L URL saisie est convertie en URL d integration par `resolveEmbed`, qui
 * n accepte que des hebergeurs connus. Une adresse refusee fait echouer
 * l enregistrement : mieux vaut un media impossible a creer qu une iframe
 * arbitraire dans le site.
 */
export const videoType: MediaType = {
	key: 'VIDEO',
	label: 'Vidéo',
	plural: 'Vidéos et reportages',
	description: 'Une vidéo hébergée sur YouTube, Vimeo ou une instance PeerTube.',
	hasBody: false,
	isOutbound: true,
	fields: [
		{
			name: 'sourceUrl',
			label: 'Adresse de la video',
			help: 'Collez l adresse de la page de la video.',
			type: 'url',
			required: true
		},
		{
			name: 'durationSeconds',
			label: 'Duree en secondes',
			type: 'number',
			required: false
		}
	],

	parseData(raw) {
		const sourceUrl = readString(raw, 'sourceUrl');
		if (!sourceUrl) return { ok: false, reason: "L'adresse de la video est obligatoire." };

		const embed = resolveEmbed(sourceUrl);
		if (!embed.ok) return { ok: false, reason: embed.reason };

		const durationSeconds = readPositiveInt(raw, 'durationSeconds');

		return {
			ok: true,
			data: {
				sourceUrl,
				provider: embed.target.provider,
				providerLabel: embed.target.providerLabel,
				// L URL d integration est FIGEE a l enregistrement : la page publique
				// n a plus a faire confiance a quoi que ce soit au moment du rendu.
				embedUrl: embed.target.embedUrl,
				watchUrl: embed.target.watchUrl,
				...(durationSeconds ? { durationSeconds } : {})
			}
		};
	}
};
