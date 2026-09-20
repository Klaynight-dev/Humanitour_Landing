/**
 * Les photographies du tour.
 *
 * Source unique : l accueil n en montre que les trois premieres, en deck, et
 * `/galerie` les affiche toutes. Les recopier page par page, c est garantir que
 * la galerie et l accueil finiront par diverger.
 *
 * Elles viennent de l association (`static/photos/`) et documentent les deux
 * mois de terrain : rencontres, marches, haltes, hebergements. Aucune image de
 * banque, aucune image generee (AGENTS.md § 6).
 *
 * Les personnes photographiees ont donne leur accord pour l usage de leur
 * image (CLAUDE.md, « Mandat »).
 *
 * `width` et `height` sont les dimensions NATIVES du fichier, relevees sur le
 * fichier lui-meme : elles reservent la place de l image avant son chargement.
 * Deposer un nouveau cliche demande donc de relever ses dimensions reelles,
 * sans quoi la page saute au chargement.
 */
export interface TourPhoto {
	readonly src: string;
	readonly width: number;
	readonly height: number;
	readonly alt: string;
}

/**
 * La photographie de couverture de l accueil.
 *
 * Declaree ici et reprise dans `TOUR_PHOTOS` ci-dessous, plutot que recopiee
 * dans la page : la couverture et la galerie montrent alors litteralement le
 * meme objet, et ses dimensions ne peuvent plus decrire un autre fichier que
 * celui qu elle affiche.
 *
 * Elle est en format PAYSAGE alors que la couverture la cadre dans une colonne
 * haute : `object-fit: cover` en rogne donc les cotes.
 */
export const HERO_PHOTO: TourPhoto = {
	src: '/photos/IMG_2316.JPG',
	width: 2048,
	height: 1536,
	alt: 'Le vélo de Côme Moudenner, drapeaux français et breton et tête de coq à l’arrière, posé devant un troupeau de vaches dans un pré.'
};

export const TOUR_PHOTOS: readonly TourPhoto[] = [
	{
		src: '/photos/tour-route.jpg',
		width: 865,
		height: 1081,
		alt: "Côme Moudenner en mouvement, de profil, sur son vélo de voyage, la tête de coq arrimée à l'arrière."
	},
	{
		src: '/photos/IMG_2199.JPG',
		width: 1536,
		height: 2048,
		alt: 'Côme Moudenner devant une maison couverte de lierre, en survêtement bleu « Liberté Égalité Fraternité », son vélo chargé et la tête de coq posés devant lui.'
	},
	{
		src: '/photos/IMG_2204.JPG',
		width: 1536,
		height: 2048,
		alt: 'Côme Moudenner au bord d’une route de campagne, entre haies et hortensias, dans la même tenue et devant son vélo chargé.'
	},
	{
		src: '/photos/IMG_2246.JPG',
		width: 2048,
		height: 1536,
		alt: 'Côme Moudenner en terrasse du Bar des Potiers, entouré de quatre habitants attablés autour d’un verre.'
	},
	{
		src: '/photos/IMG_2253.JPG',
		width: 1536,
		height: 2048,
		alt: 'Côme Moudenner sur une place, attablé avec deux habitants devant un verre, son vélo et la tête de coq au premier plan.'
	},
	{
		src: '/photos/IMG_2263.JPG',
		width: 1536,
		height: 2048,
		alt: 'Selfie de Côme Moudenner avec un habitant torse nu tenant un petit chien poméranien.'
	},
	{
		src: '/photos/IMG_2265.JPG',
		width: 1536,
		height: 2048,
		alt: 'Côme Moudenner sous la tente d’un marché, avec un couple de maraîchers et leurs cageots de petits pois, d’ail et de pommes de terre.'
	},
	{
		src: '/photos/IMG_2298.JPG',
		width: 1536,
		height: 2048,
		alt: 'Côme Moudenner dans un champ moissonné avec trois habitants, le Mont-Saint-Michel visible à l’horizon.'
	},
	{
		src: '/photos/IMG_2313.JPG',
		width: 2048,
		height: 1536,
		alt: 'Selfie de Côme Moudenner devant un troupeau de vaches limousines venues l’observer dans leur pré.'
	},
	HERO_PHOTO,
	{
		src: '/photos/IMG_2326.JPG',
		width: 1536,
		height: 2048,
		alt: 'Côme Moudenner devant une boulangerie-pâtisserie, avec une commerçante tenant une viennoiserie.'
	},
	{
		src: '/photos/IMG_2330.JPG',
		width: 1536,
		height: 2048,
		alt: 'Côme Moudenner en terrasse d’un bar-tabac, attablé avec un habitant, son vélo garé devant.'
	},
	{
		src: '/photos/IMG_2338.JPG',
		width: 2048,
		height: 1536,
		alt: 'Côme Moudenner reçoit un repas en plein air, près d’une caravane, avec une famille de quatre personnes qui l’héberge pour la soirée.'
	},
	{
		src: '/photos/IMG_2343.JPG',
		width: 2048,
		height: 1536,
		alt: 'Côme Moudenner devant une maison en pierre, avec la famille qui l’a accueilli pour la nuit.'
	},
	{
		src: '/photos/IMG_2347.JPG',
		width: 2048,
		height: 1536,
		alt: 'Côme Moudenner devant un food-truck garé sur une place, avec un habitant assis à côté de son vélo.'
	},
	{
		src: '/photos/IMG_2361.JPG',
		width: 2048,
		height: 1536,
		alt: 'Côme Moudenner dans le jardin d’une famille qui l’a hébergé, son vélo garé devant eux.'
	},
	{
		src: '/photos/IMG_2397.JPG',
		width: 1536,
		height: 2048,
		alt: 'Côme Moudenner devant une pizzeria, entouré d’une habitante et de deux adolescents.'
	},
	{
		src: '/photos/IMG_2399.JPG',
		width: 1536,
		height: 2048,
		alt: 'Un jeune couple montre du doigt les signatures laissées sur la tête de coq du vélo de Côme Moudenner.'
	},
	{
		src: '/photos/IMG_2413.JPG',
		width: 2048,
		height: 1536,
		alt: 'Selfie de Côme Moudenner avec une habitante, dans un jardin.'
	},
	{
		src: '/photos/IMG_2426.JPG',
		width: 1536,
		height: 2048,
		alt: 'Côme Moudenner devant l’entrée d’une maison, avec le couple qui l’a accueilli.'
	},
	{
		src: '/photos/IMG_2435.JPG',
		width: 2048,
		height: 1536,
		alt: 'Selfie de Côme Moudenner avec un couple d’habitants âgés, devant leur maison.'
	},
	{
		src: '/photos/IMG_2448.JPG',
		width: 2048,
		height: 1536,
		alt: 'Côme Moudenner en terrasse avec un groupe d’habitantes rencontrées en chemin.'
	},
	{
		src: '/photos/IMG_2452.JPG',
		width: 1536,
		height: 2048,
		alt: 'Le vélo de Côme Moudenner garé devant le panneau d’entrée de la commune de Hénin-Beaumont.'
	},
	{
		src: '/photos/IMG_2481.JPG',
		width: 1536,
		height: 2048,
		alt: 'Côme Moudenner devant une crêperie, avec le couple qui la tient et un ours en peluche géant portant un maillot de football.'
	},
	{
		src: '/photos/IMG_4660.JPG',
		width: 1536,
		height: 2048,
		alt: 'Côme Moudenner à vélo devant une cathédrale gothique en grès.'
	},
	{
		src: '/photos/IMG_5018.JPG',
		width: 1536,
		height: 2048,
		alt: 'Côme Moudenner, casque à crête rouge sur la tête, pose devant la cathédrale Notre-Dame de Paris avec son vélo chargé et la tête de coq à l’arrière.'
	}
];

/**
 * Les trois cliches du deck de l accueil.
 *
 * Trois et pas davantage : le deck n en laisse voir que deux au repos et un
 * troisieme au survol. Ce sont les premieres de la galerie, pas une selection
 * separee, pour qu ajouter une photo en tete de `TOUR_PHOTOS` suffise a changer
 * l apercu.
 */
export const DECK_PHOTOS: readonly TourPhoto[] = TOUR_PHOTOS.slice(0, 3);
