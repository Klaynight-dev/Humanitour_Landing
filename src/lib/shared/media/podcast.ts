import { readPositiveInt, readString, type MediaType } from './types';

/**
 * Episode audio.
 *
 * La piste est servie par un lecteur maison : pas d integration tierce, donc pas
 * de traceur chez le visiteur qui ecoute.
 */
export const podcastType: MediaType = {
	key: 'PODCAST',
	label: 'Podcast',
	plural: 'Podcasts',
	description: 'Un echange enregistre sur le terrain, diffuse en audio.',
	hasBody: false,
	isOutbound: false,
	fields: [
		{
			name: 'audioUrl',
			label: 'Adresse du fichier audio',
			help: 'Fichier MP3, OGG ou M4A, en HTTPS.',
			type: 'url',
			required: true
		},
		{ name: 'durationSeconds', label: 'Duree en secondes', type: 'number', required: false },
		{
			name: 'transcript',
			label: 'Transcription',
			help: "Rend l'episode accessible aux personnes sourdes et indexable.",
			type: 'textarea',
			required: false
		}
	],

	parseData(raw) {
		const audioUrl = readString(raw, 'audioUrl');
		if (!audioUrl) return { ok: false, reason: "L'adresse du fichier audio est obligatoire." };

		if (!audioUrl.startsWith('https://') && !audioUrl.startsWith('/')) {
			return { ok: false, reason: "L'adresse audio doit etre en HTTPS ou interne au site." };
		}

		const durationSeconds = readPositiveInt(raw, 'durationSeconds');
		const transcript = readString(raw, 'transcript');

		return {
			ok: true,
			data: {
				audioUrl,
				...(durationSeconds ? { durationSeconds } : {}),
				...(transcript ? { transcript } : {})
			}
		};
	}
};
