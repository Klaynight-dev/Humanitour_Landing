<script lang="ts">
	import Button from '$components/Button.svelte';
	import { LINKS } from '$lib/shared/site';

	/**
	 * Le carnet de route du tour, tenu sur Polarsteps et encadre ici.
	 *
	 * COOKIE TIERS, ET C EST UNE DEROGATION ASSUMEE. `AGENTS.md` § 6 pose que le
	 * cookie de session est le seul cookie du site public. Polarsteps en depose
	 * un (`session`) et charge son propre JavaScript des que cette page s ouvre.
	 * Le porteur du projet a tranche le 20 septembre 2026 : cadre direct, pas de
	 * clic-pour-charger. La regle du § 6 reste entiere partout ailleurs, et la
	 * politique de confidentialite devra nommer ce cookie avant la mise en
	 * production.
	 *
	 * L adresse est une CONSTANTE du depot, pas une saisie de back-office : il n y
	 * a donc rien a valider ici, contrairement aux videos de `/medias` dont
	 * l adresse est reconstruite a partir du seul identifiant
	 * (`shared/media/embed.ts`).
	 */
	const EMBED_URL = `${LINKS.polarsteps.href}/embed`;
</script>

<div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-14">
	<!--
		`sandbox` et `referrerpolicy` bornent ce que la page tierce peut faire et
		apprendre du visiteur, comme pour les videos de `/medias`. Le rapport de
		cadrage est plus haut que large sur telephone : une carte a besoin de
		hauteur, et un 16/9 sur un ecran de 360 px ne montre plus rien.
	-->
	<div class="rounded-block bg-cream aspect-4/5 w-full overflow-hidden sm:aspect-16/10">
		<iframe
			src={EMBED_URL}
			title="Carnet de route du tour Humanitour sur Polarsteps"
			class="h-full w-full"
			loading="lazy"
			referrerpolicy="strict-origin-when-cross-origin"
			sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
		></iframe>
	</div>

	<!--
		Le texte n est pas une legende decorative : c est le chemin de secours. Un
		bloqueur de traqueurs, une coupure chez Polarsteps ou un navigateur sans
		JavaScript laissent le cadre vide, et le lien sortant, lui, marche
		toujours.
	-->
	<div>
		<!-- Ce qui est affirme ici se verifie dans le cadre a cote, et rien de plus :
		     le contenu du carnet appartient a l association, pas a ce composant. -->
		<p class="measure leading-relaxed">
			Le carnet a été tenu sur la route, étape après étape. Il est hébergé par Polarsteps, qui
			dépose son propre cookie et charge ses propres scripts dès l'ouverture de cette page.
		</p>
		<div class="mt-7">
			<Button href={LINKS.polarsteps.href} external variant="outline">
				Ouvrir le carnet sur Polarsteps
			</Button>
		</div>
	</div>
</div>
