import { describe, expect, it } from 'vitest';
import {
	allowedProviders,
	formatDuration,
	getMediaType,
	MEDIA_TYPES,
	readPositiveInt,
	readString,
	requireMediaType,
	resolveEmbed
} from './index';

describe('registre des natures de media', () => {
	it('expose des cles uniques', () => {
		const keys = MEDIA_TYPES.map((type) => type.key);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('couvre les quatre natures attendues', () => {
		expect(MEDIA_TYPES.map((type) => type.key).toSorted()).toEqual([
			'ARTICLE',
			'PODCAST',
			'PRESS',
			'VIDEO'
		]);
	});

	it('decrit chaque nature : un formulaire sans libelle est inutilisable', () => {
		for (const type of MEDIA_TYPES) {
			expect(type.label.length).toBeGreaterThan(0);
			expect(type.description.length).toBeGreaterThan(0);
			for (const field of type.fields) {
				expect(field.label.length).toBeGreaterThan(0);
			}
		}
	});

	it('retourne null pour une nature inconnue et leve avec require', () => {
		expect(getMediaType('TELEGRAMME')).toBeNull();
		expect(() => requireMediaType('TELEGRAMME')).toThrow(/inconnue/i);
	});

	it('reserve le corps redige a l article', () => {
		expect(requireMediaType('ARTICLE').hasBody).toBe(true);
		expect(requireMediaType('VIDEO').hasBody).toBe(false);
	});

	it('marque comme sortants les medias qui renvoient ailleurs', () => {
		expect(requireMediaType('PRESS').isOutbound).toBe(true);
		expect(requireMediaType('ARTICLE').isOutbound).toBe(false);
	});
});

describe('resolveEmbed', () => {
	it('reconnait une adresse YouTube classique', () => {
		const result = resolveEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.target.provider).toBe('youtube');
		// Domaine sans cookie : aucun traceur avant lecture.
		expect(result.target.embedUrl).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
	});

	it('reconnait les formes courtes et les Shorts', () => {
		expect(resolveEmbed('https://youtu.be/dQw4w9WgXcQ').ok).toBe(true);
		expect(resolveEmbed('https://www.youtube.com/shorts/dQw4w9WgXcQ').ok).toBe(true);
	});

	it('ignore les parametres de suivi de l adresse d origine', () => {
		// L URL d integration est RECONSTRUITE : rien de l adresse saisie n y passe
		// tel quel, donc aucun parametre injecte ne survit.
		const result = resolveEmbed(
			'https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=TRACKER&list=SPAM'
		);

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.target.embedUrl).not.toContain('TRACKER');
		expect(result.target.embedUrl).not.toContain('SPAM');
	});

	it('reconnait une adresse Vimeo', () => {
		const result = resolveEmbed('https://vimeo.com/123456789');

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.target.embedUrl).toBe('https://player.vimeo.com/video/123456789');
	});

	it('reconnait une instance PeerTube autorisee', () => {
		const result = resolveEmbed('https://framatube.org/w/abcdefgh12345678');

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.target.embedUrl).toBe('https://framatube.org/videos/embed/abcdefgh12345678');
	});

	it('refuse une instance PeerTube hors liste', () => {
		// PeerTube est federe : accepter n importe quel hote reviendrait a laisser
		// integrer une page arbitraire dans le site.
		const result = resolveEmbed('https://instance-inconnue.example/w/abcdefgh12345678');

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.reason).toMatch(/non autorisé/i);
	});

	it('refuse un hebergeur inconnu', () => {
		expect(resolveEmbed('https://exemple.fr/video/1').ok).toBe(false);
	});

	it('refuse une adresse non HTTPS', () => {
		expect(resolveEmbed('http://www.youtube.com/watch?v=dQw4w9WgXcQ').ok).toBe(false);
	});

	it('refuse une chaine qui n est pas une adresse', () => {
		expect(resolveEmbed('pas une adresse').ok).toBe(false);
		expect(resolveEmbed('javascript:alert(1)').ok).toBe(false);
	});

	it('refuse une adresse du bon hebergeur sans identifiant', () => {
		const result = resolveEmbed('https://www.youtube.com/');

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.reason).toMatch(/introuvable/i);
	});

	it('annonce les hebergeurs acceptes', () => {
		const providers = allowedProviders();

		expect(providers).toContain('YouTube');
		expect(providers.some((entry) => entry.includes('framatube.org'))).toBe(true);
	});
});

describe('videoType.parseData', () => {
	const type = requireMediaType('VIDEO');

	it('fige l adresse d integration a l enregistrement', () => {
		const result = type.parseData({ sourceUrl: 'https://youtu.be/dQw4w9WgXcQ' });

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.embedUrl).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
		expect(result.data.provider).toBe('youtube');
	});

	it('refuse un media dont l adresse est absente', () => {
		expect(type.parseData({}).ok).toBe(false);
	});

	it('refuse un hebergeur non autorise plutot que de le stocker', () => {
		expect(type.parseData({ sourceUrl: 'https://exemple.fr/v/1' }).ok).toBe(false);
	});

	it('conserve une duree valide et ignore une duree absurde', () => {
		const withDuration = type.parseData({
			sourceUrl: 'https://youtu.be/dQw4w9WgXcQ',
			durationSeconds: 212
		});
		expect(withDuration.ok && withDuration.data.durationSeconds).toBe(212);

		const withJunk = type.parseData({
			sourceUrl: 'https://youtu.be/dQw4w9WgXcQ',
			durationSeconds: -5
		});
		expect(withJunk.ok && 'durationSeconds' in withJunk.data).toBe(false);
	});
});

describe('podcastType.parseData', () => {
	const type = requireMediaType('PODCAST');

	it('accepte une piste en HTTPS', () => {
		const result = type.parseData({ audioUrl: 'https://media.humanitour.fr/ep1.mp3' });
		expect(result.ok).toBe(true);
	});

	it('accepte une piste interne au site', () => {
		expect(type.parseData({ audioUrl: '/media/ep1.mp3' }).ok).toBe(true);
	});

	it('refuse une piste en clair', () => {
		expect(type.parseData({ audioUrl: 'http://exemple.fr/ep1.mp3' }).ok).toBe(false);
	});

	it('refuse un episode sans piste', () => {
		expect(type.parseData({}).ok).toBe(false);
	});

	it('conserve la transcription, qui rend l episode accessible', () => {
		const result = type.parseData({
			audioUrl: 'https://media.humanitour.fr/ep1.mp3',
			transcript: 'Bonjour et bienvenue.'
		});

		expect(result.ok && result.data.transcript).toBe('Bonjour et bienvenue.');
	});
});

describe('pressType.parseData', () => {
	const type = requireMediaType('PRESS');

	it('exige le nom du media source', () => {
		// Un lien sans sa provenance oblige le lecteur a cliquer pour savoir qui parle.
		const result = type.parseData({ sourceUrl: 'https://exemple.fr/article' });

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.reason).toMatch(/nom du média/i);
	});

	it('exige l adresse de l article', () => {
		expect(type.parseData({ sourceName: 'Le Monde' }).ok).toBe(false);
	});

	it('accepte une reprise complete', () => {
		const result = type.parseData({
			sourceName: 'Le Monde',
			sourceUrl: 'https://lemonde.fr/article',
			author: 'Une journaliste'
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.sourceName).toBe('Le Monde');
	});

	it('refuse une adresse qui n est pas une URL web', () => {
		expect(
			type.parseData({ sourceName: 'Le Monde', sourceUrl: 'ftp://exemple.fr/a' }).ok
		).toBe(false);
	});
});

describe('articleType.parseData', () => {
	const type = requireMediaType('ARTICLE');

	it('accepte un article sans champ specifique', () => {
		expect(type.parseData({}).ok).toBe(true);
	});

	it('conserve le chapo quand il est fourni', () => {
		const result = type.parseData({ standfirst: 'Un chapo.' });
		expect(result.ok && result.data.standfirst).toBe('Un chapo.');
	});
});

describe('lecteurs de donnees libres', () => {
	it('readString ignore une valeur vide ou non textuelle', () => {
		expect(readString({ a: '  x  ' }, 'a')).toBe('x');
		expect(readString({ a: '   ' }, 'a')).toBeNull();
		expect(readString({ a: 12 }, 'a')).toBeNull();
		expect(readString(null, 'a')).toBeNull();
	});

	it('readPositiveInt refuse zero, negatif et decimal', () => {
		expect(readPositiveInt({ a: 5 }, 'a')).toBe(5);
		expect(readPositiveInt({ a: '5' }, 'a')).toBe(5);
		expect(readPositiveInt({ a: 0 }, 'a')).toBeNull();
		expect(readPositiveInt({ a: -1 }, 'a')).toBeNull();
		expect(readPositiveInt({ a: 1.5 }, 'a')).toBeNull();
		expect(readPositiveInt(null, 'a')).toBeNull();
	});
});

describe('formatDuration', () => {
	it('ecrit les minutes', () => {
		expect(formatDuration(212)).toBe('3 min');
	});

	it('ecrit les heures au-dela de soixante minutes', () => {
		expect(formatDuration(3720)).toBe('1 h 02');
	});

	it('rend une chaine vide pour une duree absente', () => {
		expect(formatDuration(null)).toBe('');
		expect(formatDuration(0)).toBe('');
	});
});
