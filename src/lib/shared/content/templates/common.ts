import { DECK_PHOTOS } from '../../photos';
import { TEAM } from '../../site';

/**
 * Ce que deux modeles ont en commun.
 *
 * L'equipe et les photographies mises en avant vivent dans le code
 * (`shared/site.ts`, `shared/photos.ts`) : ce sont des personnes reelles et des
 * cliches de l'association, pas du contenu invente. Les sections qui les
 * affichent savent retomber dessus toutes seules quand elles ne portent rien.
 *
 * Mais un repli ne se modifie pas : une section qui ne porte aucune ligne n'a
 * rien a cliquer, et l'equipe n'etait donc corrigeable que par un deploiement.
 * Les modeles d'origine portent desormais ces listes, construites ICI a partir
 * de la meme source. Recomposer une page — ou la reinitialiser — donne donc une
 * equipe et des photographies modifiables, sans avoir a les resaisir, et sans
 * que `home.ts` et `about.ts` en tiennent deux copies qui divergeraient.
 */

/** Le portrait depose par le depot, sous le `slug` de la personne. */
const PORTRAIT_SIZE = 420;

export function templateTeam(): Record<string, unknown>[] {
	return TEAM.map((member) => ({
		name: member.name,
		role: member.role,
		bio: member.bio,
		portrait: {
			// La description est exigee a la saisie : une image sans description ne
			// se publie pas. Le rendu, lui, pose `alt=""` sur ces portraits, parce
			// que le nom est ecrit juste en dessous et qu'un lecteur d'ecran
			// l'entendrait sinon deux fois. Ce qui est stocke ici decrit le fichier,
			// pour la mediatheque et pour qui le reprendra ailleurs.
			src: `/equipe/${member.slug}.jpg`,
			alt: `Portrait de ${member.name}`,
			width: PORTRAIT_SIZE,
			height: PORTRAIT_SIZE
		},
		...(member.website === undefined ? {} : { website: member.website })
	}));
}

/**
 * Les trois cliches du deck de l'accueil.
 *
 * La description est celle de `shared/photos.ts`, la meme que `/galerie`
 * affiche en legende. Le deck, lui, rend `alt=""` : les trois photographies y
 * sont decoratives, leur destination etant portee par le lien qui les entoure.
 */
export function templateDeck(): Record<string, unknown>[] {
	return DECK_PHOTOS.map((photo) => ({
		photo: { src: photo.src, alt: photo.alt, width: photo.width, height: photo.height }
	}));
}
