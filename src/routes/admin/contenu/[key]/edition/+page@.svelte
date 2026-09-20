<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { setContentContext } from '$components/content/context';
	import BlockFields from '$components/admin/editor/BlockFields.svelte';
	import BlockFrame from '$components/admin/editor/BlockFrame.svelte';
	import InlineToolbar from '$components/admin/editor/InlineToolbar.svelte';
	import { applyCommand, type FieldChange, type FieldKind } from '$components/admin/editor/inline';
	import StatusBadge from '$components/admin/StatusBadge.svelte';
	import { insertAfter, move, removeAt, type ArrangedBlock } from '$lib/shared/content/arrange';
	import { setPath } from '$lib/shared/content/form';
	import { getContentBlockType } from '$lib/shared/content';
	import { can } from '$lib/shared/permissions';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	/**
	 * L'editeur de page.
	 *
	 * Il rend les vrais composants du site, avec les vraies donnees, et le texte
	 * se tape DANS la page : les composants publics marquent les elements qui
	 * portent un champ, et l'editeur les rend modifiables. Le panneau de droite
	 * ne garde que ce qui ne se tape pas — images, variantes de mise en page,
	 * boutons, listes.
	 *
	 * La page entiere tient en memoire : deplacer, dupliquer ou retirer une
	 * section ne demande aucune requete, et rien ne part en base tant qu'on
	 * n'enregistre pas.
	 *
	 * `+page@.svelte` : la page sort du gabarit du back-office pour occuper
	 * l'ecran entier. La garde de permission ne repose donc pas dessus, elle est
	 * dans `+page.server.ts` comme sur chaque ecran d'administration.
	 */
	const editable = $derived(can(data.user, 'content.write'));
	const publishable = $derived(can(data.user, 'content.publish'));

	interface EditorBlock extends ArrangedBlock {
		/** Le motif du refus de validation, ou `null`. */
		invalid: string | null;
	}

	/*
	 * Point de depart de l'edition : ensuite, ce sont les sections a l'ecran qui
	 * font foi. `untrack` le dit au compilateur plutot que de le laisser deviner
	 * qu'une lecture unique est voulue. Meme remarque que dans `ListField`.
	 */
	let nextKey = untrack(() => data.blocks.length);
	let blocks: EditorBlock[] = $state(
		untrack(() =>
			data.blocks.map((block, index) => ({
				key: index,
				type: block.type,
				data: block.data,
				invalid: null
			}))
		)
	);

	/** La section ouverte dans le panneau, par sa cle de travail. */
	let selected: number | null = $state(null);
	/** Le rang apres lequel poser une nouvelle section, `null` si le catalogue est ferme. */
	let adding: number | null = $state(null);
	/** Vrai des qu'une modification n'est pas enregistree. */
	let dirty = $state(false);
	/** Sur petit ecran, le canevas et le panneau ne tiennent pas cote a cote. */
	let panelOpen = $state(false);
	/** Le champ enrichi qui a le curseur : la barre de mise en forme s'y pose. */
	let focused: { kind: FieldKind; element: HTMLElement } | null = $state(null);
	/** Confirmation de la remise a zero : elle jette un travail en cours. */
	let resetting = $state(false);

	/** Les chemins modifiables dans le rendu, par section. */
	let inlinePaths: Record<number, readonly string[]> = $state({});

	/**
	 * Ce qui est tape dans le rendu, en attente.
	 *
	 * Volontairement HORS de l'etat reactif : retenir chaque frappe ferait
	 * reconstruire a Svelte les noeuds qu'on est en train de remplir, et le
	 * curseur sauterait. La saisie est retenue quand le curseur quitte le champ,
	 * et de toute facon avant l'enregistrement.
	 */
	let pending: Record<number, Record<string, unknown>> = {};

	const current = $derived(blocks.find((block) => block.key === selected) ?? null);
	const currentIndex = $derived(blocks.findIndex((block) => block.key === selected));
	const broken = $derived(blocks.filter((block) => block.invalid !== null));


	function labelOf(type: string): string {
		return getContentBlockType(type)?.label ?? type;
	}

	/*
	 * Le contexte que les sections publiques lisent. Les jetons sont ceux que le
	 * site applique vraiment : un texte qui cite le seuil d'anonymat affiche donc
	 * ici la meme valeur qu'en ligne, et l'apercu ne ment pas.
	 */
	setContentContext({
		get tokens() {
			return data.tokens;
		},
		get team() {
			return data.team;
		},
		get catalogue() {
			return undefined;
		}
	});

	function touch() {
		dirty = true;
	}

	function select(key: number) {
		selected = key;
		adding = null;
		panelOpen = true;
	}

	function onMove(index: number, direction: -1 | 1) {
		blocks = move(blocks, index, direction);
		touch();
	}

	/** La copie garde tout de l'originale sauf sa cle de travail, qui l'identifie. */
	function onDuplicate(index: number) {
		const source = blocks[index];
		if (!source) return;

		blocks = insertAfter(blocks, index, { ...source, key: nextKey++ });
		touch();
	}

	function onRemove(index: number) {
		const removed = blocks[index];
		blocks = removeAt(blocks, index);
		if (removed && removed.key === selected) selected = null;
		touch();
	}

	/**
	 * Ajoute une section deja remplie d'un exemple juste.
	 *
	 * Une section vide obligerait a la remplir avant de voir quoi que ce soit, et
	 * la page passerait par un etat casse entre l'ajout et la saisie.
	 */
	function onAdd(type: string, after: number) {
		const definition = getContentBlockType(type);
		if (!definition) return;

		const starter = definition.parseData(definition.starter);
		if (!starter.ok) return;

		const key = nextKey++;
		blocks = insertAfter(blocks, after, { key, type, data: starter.data, invalid: null });
		adding = null;
		selected = key;
		panelOpen = true;
		touch();
	}

	/* ------------------------------------------------------------------ */
	/* L'edition dans le texte rendu                                       */
	/* ------------------------------------------------------------------ */

	/** Une frappe dans la page : retenue en attente, pas encore dans l'etat. */
	function onEdit(key: number, change: FieldChange) {
		pending[key] = { ...(pending[key] ?? {}), [change.path]: change.value };
		touch();
	}

	/**
	 * Verse dans une section ce qui a ete tape dedans, et valide le tout.
	 *
	 * Appele quand le curseur quitte un champ, et avant tout enregistrement.
	 * C'est le seul moment ou Svelte a le droit de refaire le rendu d'un champ
	 * qu'on vient de remplir — a ce moment-la, le curseur en est deja sorti.
	 */
	function commit(key: number): EditorBlock | null {
		const index = blocks.findIndex((block) => block.key === key);
		const block = blocks[index];
		if (!block) return null;

		const held = pending[key];
		if (!held) return block;
		delete pending[key];

		let next = block.data;
		for (const [path, value] of Object.entries(held)) next = setPath(next, path, value);

		const definition = getContentBlockType(block.type);
		const parsed = definition?.parseData(next);

		const updated: EditorBlock =
			parsed && parsed.ok
				? { ...block, data: parsed.data, invalid: null }
				: { ...block, data: next, invalid: parsed ? parsed.reason : null };

		blocks[index] = updated;
		return updated;
	}

	/**
	 * Toutes les sections, saisies en attente versees.
	 *
	 * Rend le tableau plutot que de compter sur l'etat : le document part dans la
	 * foulee, et attendre que la reactivite ait circule serait exactement le
	 * genre de course qui enregistre la version d'avant.
	 */
	function commitAll(): EditorBlock[] {
		for (const key of Object.keys(pending)) commit(Number(key));
		return blocks;
	}

	function buildDocument(): string {
		return JSON.stringify(
			commitAll().map((block) => ({ type: block.type, data: block.data }))
		);
	}

	/** La barre flottante agit sur le champ qui a le curseur, et relit son document. */
	function onCommand(command: string, value?: string) {
		const field = focused;
		if (!field || selected === null) return;

		const doc = applyCommand(field.element, command, value);
		const path = field.element.dataset['field'];
		if (path === undefined) return;

		onEdit(selected, { path, kind: 'doc', value: doc });
	}

	/* ------------------------------------------------------------------ */
	/* Le panneau                                                          */
	/* ------------------------------------------------------------------ */

	function onFields(
		key: number,
		result: { ok: true; data: Record<string, unknown> } | { ok: false; reason: string }
	) {
		const index = blocks.findIndex((block) => block.key === key);
		const block = blocks[index];
		if (!block) return;

		// Une saisie refusee ne remplace pas l'apercu par du vide : la derniere
		// version valide reste affichee, et le motif du refus s'affiche sur la
		// section comme dans le panneau. L'enregistrement, lui, est bloque.
		blocks[index] = result.ok
			? { ...block, data: result.data, invalid: null }
			: { ...block, invalid: result.reason };
		touch();
	}

	/**
	 * Remet la page telle qu'elle a ete chargee.
	 *
	 * Jette tout ce qui n'est pas enregistre, y compris ce qui est encore en
	 * attente dans les champs. Les cles de travail sont refaites, donc chaque
	 * section est remontee : c'est ce qui ramene le texte tape dans la page a sa
	 * valeur d'origine, puisque le rendu en repart de zero.
	 */
	function reset() {
		pending = {};
		inlinePaths = {};
		blocks = data.blocks.map((block, index) => ({
			key: nextKey + index,
			type: block.type,
			data: block.data,
			invalid: null
		}));
		nextKey += data.blocks.length;

		selected = null;
		adding = null;
		focused = null;
		resetting = false;
		dirty = false;
	}

	/** Une navigation accidentelle ne doit pas emporter une page non enregistree. */
	function onBeforeUnload(event: BeforeUnloadEvent) {
		if (!dirty) return;
		event.preventDefault();
	}

	const BUTTON =
		'press rounded-pill inline-flex min-h-11 items-center justify-center px-4 py-2 text-sm font-medium';
</script>

<svelte:head>
	<title>{data.page.label}, édition — Back-office</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<svelte:window onbeforeunload={onBeforeUnload} />

<div class="bg-cream flex h-dvh flex-col">
	<!-- Bandeau d'edition : ce qui vaut pour la page entiere, et rien d'autre. -->
	<header class="border-ink/12 bg-paper z-20 shrink-0 border-b">
		<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5">
			<div class="flex min-w-0 items-center gap-3">
				<a href="/admin/contenu" class="{BUTTON} border-ink/25 border">Quitter</a>
				<div class="min-w-0">
					<p class="truncate font-semibold">{data.page.label}</p>
					<p class="text-muted truncate text-xs">{data.page.href}</p>
				</div>
				{#if data.status}<StatusBadge status={data.status} />{/if}
			</div>

			<div class="flex flex-wrap items-center gap-2">
				<!--
					L'etat d'enregistrement se lit en toutes lettres et non a une
					pastille : « Modifications non enregistrées » ne demande pas de
					distinguer deux couleurs.
				-->
				<p class="text-sm {dirty ? 'text-danger font-semibold' : 'text-muted'}" role="status">
					{dirty ? 'Modifications non enregistrées' : 'Tout est enregistré'}
				</p>

				<button
					type="button"
					class="{BUTTON} border-ink/25 border lg:hidden"
					aria-expanded={panelOpen}
					onclick={() => (panelOpen = !panelOpen)}
				>
					{panelOpen ? 'Voir la page' : 'Modifier'}
				</button>

				{#if editable}
					{#if resetting}
						<button type="button" class="{BUTTON} bg-danger text-paper font-semibold" onclick={reset}>
							Confirmer la remise à zéro
						</button>
						<button type="button" class="{BUTTON} border-ink/25 border" onclick={() => (resetting = false)}>
							Annuler
						</button>
					{:else}
						<!--
							Reinitialiser jette le travail en cours : deux clics, comme la
							suppression d'une section. Desactive quand il n'y a rien a jeter,
							pour que le bouton ne promette pas une action sans effet.
						-->
						<button
							type="button"
							class="{BUTTON} border-ink/25 border disabled:opacity-40"
							disabled={!dirty}
							onclick={() => (resetting = true)}
							title="Annuler les modifications non enregistrées"
						>
							Réinitialiser
						</button>
					{/if}

					<!--
						Le document est pose dans le `FormData` au moment de l'envoi, et non
						tenu dans un champ cache : il faut d'abord verser ce qui est encore
						en attente dans les champs de la page, et un champ derive aurait
						enregistre la version d'avant.
					-->
					<form
						method="POST"
						action="?/save"
						use:enhance={({ formData }) => {
							formData.set('document', buildDocument());
							return async ({ update, result }) => {
								if (result.type === 'success') dirty = false;
								await update({ reset: false });
							};
						}}
					>
						<button
							type="submit"
							disabled={broken.length > 0}
							class="{BUTTON} border-ink/25 border font-semibold disabled:opacity-40"
						>
							Enregistrer
						</button>
					</form>
				{/if}

				{#if publishable}
					{#if data.status === 'PUBLISHED'}
						<form method="POST" action="?/unpublish" use:enhance>
							<button type="submit" class="{BUTTON} border-ink/25 border">Dépublier</button>
						</form>
					{/if}
					<form
						method="POST"
						action="?/publish"
						use:enhance={({ formData }) => {
							formData.set('document', buildDocument());
							return async ({ update, result }) => {
								if (result.type === 'success') dirty = false;
								await update({ reset: false });
							};
						}}
					>
						<button
							type="submit"
							disabled={broken.length > 0}
							class="{BUTTON} bg-ink text-paper font-semibold disabled:opacity-40"
						>
							Enregistrer et publier
						</button>
					</form>
				{/if}
			</div>
		</div>

		{#if form?.message}
			<p class="border-ink/12 bg-cream border-t px-4 py-2 text-sm" role="status">{form.message}</p>
		{/if}

		{#if broken.length > 0}
			<p class="bg-danger text-paper px-4 py-2 text-sm font-medium" role="status">
				{broken.length} section{broken.length > 1 ? 's' : ''} à corriger avant d'enregistrer :
				{broken.map((block) => labelOf(block.type)).join(', ')}.
			</p>
		{/if}

		{#if data.fromTemplate}
			<p class="border-ink/12 bg-cream border-t px-4 py-2 text-sm" role="status">
				Cette page n'a jamais été enregistrée : vous partez de son modèle d'origine, celui que le
				site sert aujourd'hui.
			</p>
		{/if}
	</header>

	<InlineToolbar element={focused?.element ?? null} onapply={onCommand} />

	<div class="flex min-h-0 flex-1">
		<!--
			Le canevas. Fond blanc et largeur entiere : c'est la page telle qu'elle
			sera, pas une maquette dans une carte.
		-->
		<main
			class="canvas bg-paper min-w-0 flex-1 overflow-y-auto lg:block"
			class:hidden={panelOpen}
			aria-label="Aperçu de la page"
		>
			{#if blocks.length === 0}
				<div class="p-16 text-center">
					<p class="text-lg font-semibold">Page vide</p>
					<p class="text-muted mx-auto mt-2 max-w-md text-sm">
						Ajoutez une première section depuis le panneau, ou réappliquez le modèle d'origine
						depuis l'écran de contenu.
					</p>
					{#if editable}
						<button
							type="button"
							class="{BUTTON} bg-ink text-paper mt-6 font-semibold"
							onclick={() => {
								adding = -1;
								panelOpen = true;
							}}
						>
							Ajouter une section
						</button>
					{/if}
				</div>
			{/if}

			{#each blocks as block, index (block.key)}
				{#if editable}
					<div class="group/add relative h-0">
						<button
							type="button"
							class="border-ink/30 text-muted hover:border-ink hover:text-ink bg-paper rounded-pill absolute top-0 left-1/2 z-10 inline-flex min-h-11 -translate-x-1/2 -translate-y-1/2 items-center border border-dashed px-4 text-sm font-semibold opacity-0 transition-opacity group-hover/add:opacity-100 focus:opacity-100"
							onclick={() => {
								adding = index - 1;
								selected = null;
								panelOpen = true;
							}}
						>
							+ Ajouter une section ici
						</button>
					</div>
				{/if}

				<BlockFrame
					{index}
					{editable}
					total={blocks.length}
					type={block.type}
					label={labelOf(block.type)}
					data={block.data}
					selected={block.key === selected}
					invalid={block.invalid}
					onselect={() => select(block.key)}
					onmove={(direction) => onMove(index, direction)}
					onduplicate={() => onDuplicate(index)}
					onremove={() => onRemove(index)}
					onedit={(change) => onEdit(block.key, change)}
					onfield={(field) => (focused = field && field.kind === 'doc' ? field : null)}
					oninline={(paths) => (inlinePaths[block.key] = paths)}
					oncommit={() => commit(block.key)}
				/>
			{/each}

			{#if editable && blocks.length > 0}
				<div class="border-ink/12 border-t p-8 text-center">
					<button
						type="button"
						class="{BUTTON} border-ink/30 border border-dashed"
						onclick={() => {
							adding = blocks.length - 1;
							selected = null;
							panelOpen = true;
						}}
					>
						+ Ajouter une section en fin de page
					</button>
				</div>
			{/if}
		</main>

		<!-- Le panneau. Il ne pilote jamais le canevas autrement que par les donnees. -->
		<aside
			class="border-ink/12 bg-cream w-full shrink-0 overflow-y-auto border-l lg:block lg:w-96"
			class:hidden={!panelOpen}
			aria-label="Réglages de la section"
		>
			{#if adding !== null}
				<div class="border-ink/12 bg-paper flex items-center justify-between gap-3 border-b px-4 py-3">
					<h2 class="font-semibold">Ajouter une section</h2>
					<button type="button" class="text-muted text-sm underline" onclick={() => (adding = null)}>
						Fermer
					</button>
				</div>
				<div class="flex flex-col gap-5 p-4">
					{#each data.blockLibrary as group (group.label)}
						<div>
							<p class="text-muted mb-2 text-xs font-semibold tracking-wide uppercase">
								{group.label}
							</p>
							<ul class="flex flex-col gap-2">
								{#each group.types as type (type.key)}
									<li>
										<button
											type="button"
											onclick={() => onAdd(type.key, adding ?? blocks.length - 1)}
											class="border-ink/15 hover:border-ink/40 bg-paper rounded-field block w-full border p-3 text-left"
										>
											<span class="block text-sm font-semibold">{type.label}</span>
											<span class="text-muted block text-xs">{type.description}</span>
										</button>
									</li>
								{/each}
							</ul>
						</div>
					{/each}
				</div>
			{:else if current}
				<div class="border-ink/12 bg-paper flex items-center justify-between gap-3 border-b px-4 py-3">
					<div class="min-w-0">
						<h2 class="truncate font-semibold">{labelOf(current.type)}</h2>
						<p class="text-muted text-xs">
							Section {currentIndex + 1} sur {blocks.length}
						</p>
					</div>
					<button
						type="button"
						class="text-muted text-sm underline"
						onclick={() => (selected = null)}
					>
						Fermer
					</button>
				</div>

				<div class="p-4">
					{#if current.invalid}
						<p class="bg-danger text-paper rounded-field mb-4 px-3 py-2 text-sm" role="status">
							{current.invalid}
						</p>
					{/if}

					<!--
						`{#key}` : changer de section recree les champs. Sans cela, ils
						garderaient les valeurs de la section precedente, puisqu'ils sont
						poses une fois et ne sont plus pilotes ensuite.
					-->
					{#key current.key}
						<BlockFields
							type={current.type}
							data={current.data}
							library={data.library}
							disabled={!editable}
							inline={inlinePaths[current.key] ?? []}
							onchange={(result) => onFields(current.key, result)}
						/>
					{/key}
				</div>
			{:else}
				<div class="p-6">
					<h2 class="font-semibold">Tapez dans la page</h2>
					<p class="text-muted mt-2 text-sm">
						Les titres et les textes se modifient directement à gauche : cliquez dedans et
						écrivez. Une barre de mise en forme apparaît au-dessus des textes qui acceptent le
						gras, les listes et les liens.
					</p>
					<p class="text-muted mt-3 text-sm">
						Ce panneau garde le reste : images, variantes de mise en page, boutons, listes.
						Survolez une section pour la monter, la dupliquer ou la retirer.
					</p>

					{#if data.tokenList.length > 0}
						<h3 class="mt-6 text-sm font-semibold">Valeurs citées</h3>
						<p class="text-muted mt-1 text-sm">
							Certains textes citent une valeur que le site applique vraiment, au lieu de la
							recopier :
						</p>
						<ul class="text-muted mt-2 flex flex-col gap-1 text-sm">
							{#each data.tokenList as token (token.token)}
								<li>
									<code class="bg-paper rounded px-1">{token.token}</code>
									— {token.label}
								</li>
							{/each}
						</ul>
					{/if}

					<a
						href="/admin/contenu/{data.page.key.toLowerCase()}"
						class="text-coral-ink mt-6 inline-block text-sm underline"
					>
						Ouvrir l'éditeur en formulaire
					</a>
				</div>
			{/if}
		</aside>
	</div>
</div>

<style>
	/*
	 * Ce qui se tape dans la page se signale au survol, jamais au repos.
	 *
	 * Un lisere permanent sur chaque texte modifiable ferait mentir l'apercu :
	 * on ne verrait plus la page telle qu'elle sera. Au survol, en revanche, il
	 * faut savoir avant de cliquer ou l'on peut ecrire.
	 *
	 * `:global` parce que ces elements ne sont pas ecrits ici : ce sont les
	 * composants publics qui les rendent, et `inline.ts` qui pose l'attribut.
	 */
	:global(.canvas [contenteditable]) {
		cursor: text;
	}

	:global(.canvas [contenteditable]:hover) {
		outline: 1px dashed color-mix(in oklab, var(--color-ink) 45%, transparent);
		outline-offset: 4px;
	}

	/* Le contour de saisie l'emporte sur le contour global de `:focus-visible` :
	   dans le canevas, il doit se distinguer du survol sans le recopier. */
	:global(.canvas [contenteditable]:focus) {
		outline: 2px solid var(--color-ink);
		outline-offset: 4px;
	}
</style>
