<script lang="ts">
	import { navigating } from '$app/state';

	/**
	 * Barre de progression des changements de page.
	 *
	 * MOTION : c'est un mouvement FONCTIONNEL, au meme titre que `press`. Il ne
	 * decore rien, il repond a une question que l'utilisateur se pose vraiment :
	 * « est-ce que mon clic a ete pris en compte ? ». En rendu serveur, une page
	 * qui interroge la base peut mettre plusieurs centaines de millisecondes a
	 * repondre, et sans retour visuel l'ecran reste simplement fige.
	 *
	 * Trois garde-fous, et ce sont eux qui la separent du ruban decoratif :
	 *
	 * 1. Elle n'apparait QUE pendant une navigation, jamais au repos, jamais en
	 *    boucle.
	 * 2. En dessous de `DELAI_MS`, elle n'apparait pas du tout : sur une page
	 *    deja en cache, elle ne ferait que clignoter.
	 * 3. `prefers-reduced-motion` supprime la progression continue. La barre
	 *    reste affichee, parce que l'information « ca charge » n'est pas un
	 *    ornement, mais elle ne rampe plus.
	 *
	 * `aria-hidden` : SvelteKit annonce deja le titre de la nouvelle page aux
	 * lecteurs d'ecran apres chaque navigation. Doubler avec une region vivante
	 * ferait entendre deux fois le meme evenement.
	 */

	/** En dessous, la navigation est percue comme instantanee. */
	const DELAI_MS = 120;

	/**
	 * Plafond de la progression feinte. La duree reelle est inconnue : la barre
	 * approche 90 % de facon asymptotique sans jamais l'atteindre, et seul le
	 * chargement effectif la termine. Promettre 100 % avant l'arrivee serait
	 * mentir sur l'etat du chargement.
	 */
	const PLAFOND = 0.9;

	let largeur = $state(0);
	let affichee = $state(false);

	/*
	 * Miroirs non reactifs. Les lire dans l'effet en creerait des dependances,
	 * et l'effet se rejouerait a chaque pas de progression.
	 */
	let valeur = 0;
	let enCours = false;
	let barreVisible = false;

	let minuteurAffichage: ReturnType<typeof setTimeout> | undefined;
	let progression: ReturnType<typeof setInterval> | undefined;
	let minuteurMasquage: ReturnType<typeof setTimeout> | undefined;

	function toutArreter() {
		clearTimeout(minuteurAffichage);
		clearInterval(progression);
		clearTimeout(minuteurMasquage);
	}

	function mouvementReduit(): boolean {
		return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	/*
	 * `navigating` est un objet reactif qui muté PLUSIEURS fois pendant une seule
	 * navigation. Une premiere version nettoyait ses minuteurs a chaque
	 * reexecution de l'effet : le minuteur d'affichage etait donc rearme sans
	 * cesse et n'arrivait jamais a terme, la barre ne s'affichait jamais.
	 *
	 * D'ou le garde `enCours` : l'effet declenche le debut et la fin, il ne
	 * redemarre rien tant que la navigation dure.
	 */
	$effect(() => {
		const cible = navigating.to;

		if (cible) {
			if (enCours) return;
			enCours = true;

			minuteurAffichage = setTimeout(() => {
				barreVisible = true;
				affichee = true;

				if (mouvementReduit()) {
					// Pas de reptation : un etat franc, qui dit « ca charge ».
					valeur = 0.3;
					largeur = valeur;
					return;
				}

				valeur = 0.08;
				largeur = valeur;
				progression = setInterval(() => {
					valeur += (PLAFOND - valeur) * 0.12;
					largeur = valeur;
				}, 90);
			}, DELAI_MS);

			return;
		}

		if (!enCours) return;
		enCours = false;
		clearTimeout(minuteurAffichage);
		clearInterval(progression);

		// Navigation plus rapide que le seuil : la barre n'a jamais paru, il n'y a
		// rien a terminer. Le miroir non reactif, et non `affichee` : lire un
		// `$state` ici en ferait une dependance, et l'ecriture qui suit
		// relancerait l'effet en boucle.
		if (!barreVisible) {
			valeur = 0;
			largeur = 0;
			return;
		}

		valeur = 1;
		largeur = valeur;
		minuteurMasquage = setTimeout(() => {
			barreVisible = false;
			affichee = false;
			valeur = 0;
			largeur = 0;
		}, 260);
	});

	// Le seul nettoyage global : au demontage du composant.
	$effect(() => toutArreter);
</script>

{#if affichee}
	<div class="piste" aria-hidden="true">
		<div class="barre" style="transform: scaleX({largeur})"></div>
	</div>
{/if}

<style>
	/*
	 * `fixed` et non `sticky` : la barre doit rester en haut de la fenetre meme
	 * si la navigation part du milieu d'une longue page.
	 *
	 * `z-index: 100` : au-dessus de l'en-tete colle, qui est a 50.
	 */
	.piste {
		position: fixed;
		z-index: 100;
		inset: 0 0 auto 0;
		height: 3px;
		pointer-events: none;
	}

	/*
	 * `scaleX` et non `width` : la transformation est prise en charge par le
	 * compositeur, elle n'entraine ni recalcul de mise en page ni repeinture, ce
	 * qui compte au moment precis ou le navigateur est deja occupe a charger une
	 * page.
	 */
	.barre {
		height: 100%;
		width: 100%;
		transform-origin: left center;
		background-image: var(--gradient-brand-dense);
		transition: transform 180ms ease-out;
	}

	/*
	 * La barre reste, la progression continue disparait : passer d'un etat a
	 * l'autre suffit a dire « ca charge », sans mouvement entretenu.
	 */
	@media (prefers-reduced-motion: reduce) {
		.barre {
			transition: none;
		}
	}
</style>
