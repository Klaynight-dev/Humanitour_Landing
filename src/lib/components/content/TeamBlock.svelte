<script lang="ts">
	import { reveal } from '$lib/actions/reveal';
	import { SPACING_KEYS, SURFACE_KEYS } from '$lib/shared/content/blocks/common';
	import { getContentContext } from './context';
	import { sectionReader } from './read';
	import Section from './Section.svelte';
	import { mutedClass } from './surfaces';

	interface Props {
		id: string;
		data: Readonly<Record<string, unknown>>;
	}

	let { id, data }: Props = $props();

	const page = getContentContext();
	const read = $derived(sectionReader(data, page.tokens));

	const surface = $derived(read.choice('surface', SURFACE_KEYS, 'ink'));
	const spacing = $derived(read.choice('spacing', SPACING_KEYS, 'ample'));
	const layout = $derived(read.choice('layout', ['ligne', 'grille'] as const, 'ligne'));

	const title = $derived(read.text('title'));
	const intro = $derived(read.text('intro'));
	const moreHref = $derived(read.raw('moreHref'));

	/**
	 * La ligne defile a l'horizontale. Les deux booleens pilotent l'affichage des
	 * fleches : la gauche n'apparait qu'une fois qu'on a avance, la droite
	 * disparait en butee de fin, pour qu'aucune des deux ne propose un mouvement
	 * impossible.
	 */
	let row: HTMLUListElement | undefined = $state();
	let canScrollLeft = $state(false);
	let canScrollRight = $state(false);

	function updateScrollState() {
		if (!row) return;
		canScrollLeft = row.scrollLeft > 4;
		canScrollRight = row.scrollLeft + row.clientWidth < row.scrollWidth - 4;
	}

	function scrollRow(direction: 1 | -1) {
		row?.scrollBy({ left: direction * 176, behavior: 'smooth' });
	}

	$effect(() => {
		if (!row) return;
		updateScrollState();
		// Le nombre de portraits est fixe au chargement, mais leur largeur ne l'est
		// pas (redimensionnement, zoom) : les deux ecouteurs gardent les fleches
		// justes dans les deux cas.
		row.addEventListener('scroll', updateScrollState, { passive: true });
		window.addEventListener('resize', updateScrollState);
		return () => {
			row?.removeEventListener('scroll', updateScrollState);
			window.removeEventListener('resize', updateScrollState);
		};
	});

	/**
	 * Les fiches affichees.
	 *
	 * Deux sources, dans cet ordre : la liste saisie dans la section si elle
	 * existe, sinon l'equipe ecrite dans le code (`shared/site.ts`), dont l'ordre
	 * vient du serveur — tire au sort a chaque chargement, voir `context.ts`. Le
	 * tirer ici donnerait un ordre au rendu serveur et un autre a l'hydratation.
	 *
	 * Le repli n'est pas une commodite : c'est ce qui permet a l'accueil et a
	 * « A propos » de montrer la meme equipe sans la saisir deux fois. Des qu'une
	 * section porte sa propre liste, elle est seule maitre de ce qu'elle affiche.
	 */
	interface Card {
		readonly key: string;
		readonly name: string;
		readonly role: string;
		readonly bio: string;
		readonly website: string | null;
		readonly src: string;
		readonly width: number;
		readonly height: number;
	}

	/** Le portrait par defaut, pose par le depot sous le `slug` de la personne. */
	const PORTRAIT_SIZE = 420;

	const saved = $derived(read.list('members'));

	const cards: Card[] = $derived(
		saved.length > 0
			? saved.map((member, index) => {
					const portrait = read.itemImage(member, 'portrait');
					return {
						key: String(index),
						name: read.itemText(member, 'name') ?? '',
						role: read.itemText(member, 'role') ?? '',
						bio: read.itemText(member, 'bio') ?? '',
						website: read.itemText(member, 'website'),
						src: portrait?.src ?? '',
						width: portrait?.width ?? PORTRAIT_SIZE,
						height: portrait?.height ?? PORTRAIT_SIZE
					};
				})
			: (page.team ?? []).map((member) => ({
					key: member.slug,
					name: member.name,
					role: member.role,
					bio: member.bio,
					website: member.website ?? null,
					src: `/equipe/${member.slug}.jpg`,
					width: PORTRAIT_SIZE,
					height: PORTRAIT_SIZE
				}))
	);

	/** Vrai quand la liste vient de la section : elle est alors modifiable. */
	const editableList = $derived(saved.length > 0);

	/* Le corail sombre ne passe pas sur l'aplat noir (3,3:1). */
	const roleClass = $derived(surface === 'ink' ? 'text-coral' : 'text-coral-ink');
</script>

{#snippet arrow(extraClass = '')}
	<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" class={extraClass}>
		<path
			d="M5 12h14M13 6l6 6-6 6"
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</svg>
{/snippet}

<!--
	Les portraits viennent de la plaquette (`static/equipe/`). Le `alt` est vide
	parce que le nom est ecrit juste en dessous : le repeter ferait entendre deux
	fois la meme chose a un lecteur d'ecran.

	Les fiches sont identiques a dessein : ce sont des pairs, et donner plus de
	place a l'une laisserait entendre une hierarchie qui n'existe pas.
-->
<Section {surface} {spacing} labelledby={title ? id : undefined} label={title ? undefined : 'L’équipe'}>
	{#if layout === 'grille'}
		{#if title}<h2 {id} class="text-2xl sm:text-3xl" data-field="title">{title}</h2>{/if}
		{#if intro}
			<p class="measure mt-4 text-base leading-relaxed {mutedClass(surface)}" data-field="intro">{intro}</p>
		{/if}

		<ul class="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4" class:mt-16={title || intro}>
			{#each cards as member, index (member.key)}
				<!-- MOTION : les portraits entrent l'un apres l'autre, une seule fois. -->
				<li use:reveal={index * 110}>
					{#if member.src}
						<img
							src={member.src}
							alt=""
							width={member.width}
							height={member.height}
							loading="lazy"
							class="aspect-square w-40 rounded-full object-cover sm:w-44"
						/>
					{/if}
					<h3
						class="mt-5 text-xl font-semibold"
						data-field={editableList ? `members.${index}.name` : undefined}
					>{member.name}</h3>
					<p
						class="font-semibold {roleClass}"
						data-field={editableList ? `members.${index}.role` : undefined}
					>{member.role}</p>
					<p
						class="mt-3 leading-relaxed {mutedClass(surface)}"
						data-field={editableList ? `members.${index}.bio` : undefined}
					>{member.bio}</p>

					{#if member.website}
						<!-- Le libelle du lien est le domaine, pas « Site personnel » : c'est
						     ce qu'on lit dans la barre d'adresse apres avoir clique. -->
						{@const domain = member.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
						<p class="mt-3 text-sm {mutedClass(surface)}">
							Site personnel&nbsp;:
							<a
								href={member.website}
								target="_blank"
								rel="noopener noreferrer"
								class="font-semibold underline decoration-2 underline-offset-2 {roleClass}"
							>
								{domain}
							</a>
						</p>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<div class="grid gap-12 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-16">
			<div>
				{#if title}<h2 {id} class="text-2xl sm:text-3xl" data-field="title">{title}</h2>{/if}
				{#if intro}
					<p class="mt-4 text-base leading-relaxed {mutedClass(surface)}" data-field="intro">{intro}</p>
				{/if}
			</div>

			<!--
				`min-w-0` n'est pas decoratif : sans lui, la colonne implicite de la
				grille (celle du telephone, avant `lg`) se dimensionne sur la largeur
				NATURELLE de la rangee, soit les cinq portraits mis bout a bout —
				792 px mesures. Tout le bloc, titre et texte compris, est alors mis en
				page sur cette largeur et rogne par l'`overflow-hidden` de la section :
				le paragraphe se coupait en plein milieu d'une phrase. La colonne large
				a deja sa protection (`minmax(0,1fr)`), la colonne etroite ne l'avait
				pas.
			-->
			<div class="relative min-w-0">
				<!--
					`overflow-x-auto` + `snap-x` : sur un ecran etroit, cinq portraits a
					taille lisible ne tiennent pas dans la largeur, et les reduire
					jusqu'a ce qu'ils y tiennent les rendrait illisibles. Le defilement
					horizontal garde leur taille et la ligne unique.

					`scroll-px-4` accompagne OBLIGATOIREMENT le `px-4` : sans lui, le
					point d'accrochage le plus a gauche est celui du premier portrait,
					qui commence a la marge interieure, et la butee se stabilise a 16 px
					au lieu de zero — la fleche gauche resterait affichee en permanence.
				-->
				<ul
					bind:this={row}
					class="team-row -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-x-6 overflow-x-auto px-4 pb-2"
				>
					{#each cards as member, index (member.key)}
						<li use:reveal={index * 110} class="w-28 shrink-0 snap-start sm:w-36">
							{#if member.src}
								<img
									src={member.src}
									alt=""
									width={member.width}
									height={member.height}
									loading="lazy"
									decoding="async"
									class="rounded-block aspect-square w-full object-cover"
								/>
							{/if}
							<p
								class="mt-4 text-base leading-tight font-semibold"
								data-field={editableList ? `members.${index}.name` : undefined}
							>{member.name}</p>
							<p
								class="mt-1 text-sm opacity-70"
								data-field={editableList ? `members.${index}.role` : undefined}
							>{member.role}</p>
						</li>
					{/each}

					{#if moreHref}
						<li class="w-28 shrink-0 snap-start sm:w-36">
							<a
								href={moreHref}
								aria-label="Voir plus : toute l'équipe et leurs parcours"
								class="glass-chip rounded-block text-ink focus-visible:outline-ink flex aspect-square w-full flex-col items-center justify-center gap-1.5 text-sm font-semibold transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4"
							>
								{@render arrow()}
								Voir plus
							</a>
						</li>
					{/if}
				</ul>

				{#if canScrollLeft}
					<button
						type="button"
						onclick={() => scrollRow(-1)}
						aria-label="Faire défiler l'équipe vers la gauche"
						class="glass-chip text-ink focus-visible:outline-ink absolute top-14 left-2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 sm:top-18"
					>
						{@render arrow('rotate-180')}
					</button>
				{/if}

				{#if canScrollRight}
					<button
						type="button"
						onclick={() => scrollRow(1)}
						aria-label="Faire défiler l'équipe vers la droite"
						class="glass-chip text-ink focus-visible:outline-ink absolute top-14 right-2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 sm:top-18"
					>
						{@render arrow()}
					</button>
				{/if}
			</div>
		</div>
	{/if}
</Section>

<style>
	/*
	 * La ligne defile horizontalement. La scrollbar reste fonctionnelle
	 * (clavier, trackpad, glisser tactile) mais s'efface visuellement : un filet
	 * gris sur l'aplat noir n'ajoute que du bruit a une rangee deja lisible par
	 * ses cartes.
	 */
	.team-row {
		scrollbar-width: none;
	}

	.team-row::-webkit-scrollbar {
		display: none;
	}
</style>
