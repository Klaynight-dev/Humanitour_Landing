<script lang="ts">
	import { untrack } from 'svelte';
	import type { LibraryGroup, LibraryImage } from '$lib/shared/content/library';

	interface Props {
		/** Prefixe du champ, par exemple `data.image`. */
		name: string;
		label: string;
		help?: string;
		required: boolean;
		value: Readonly<Record<string, unknown>>;
		library: readonly LibraryGroup[];
		disabled: boolean;
	}

	let { name, label, help, required, value, library, disabled }: Props = $props();

	/**
	 * Une image se choisit de trois facons, et les trois servent.
	 *
	 * La bibliotheque d'abord : les photographies du tour et les portraits sont
	 * deja dans le depot, avec leur description ecrite et leurs dimensions
	 * relevees. Les choisir la evite de redeposer un cliche qui existe et,
	 * surtout, de le redecrire moins bien.
	 *
	 * Le televersement ensuite, pour ce qui n'existe pas encore. Il a sa propre
	 * action, en haut de la page : un formulaire ne peut pas en contenir un
	 * autre, et une image doit etre visible avant l'enregistrement.
	 *
	 * L'adresse enfin, saisie a la main, pour une image hebergee ailleurs.
	 * C'est ce champ-la qui porte la valeur : les deux autres chemins ne font
	 * que le remplir. Sans JavaScript, il reste utilisable seul, complete par
	 * la liste native des adresses connues.
	 */
	/*
	 * La valeur enregistree n'est qu'un point de depart : a partir de la, c'est
	 * la saisie en cours qui fait foi, jusqu'a l'enregistrement. `untrack` le dit
	 * explicitement — sans lui, Svelte soupconne a juste titre une prop lue une
	 * seule fois par inadvertance.
	 */
	let src = $state(untrack(() => String(value.src ?? '')));
	let alt = $state(untrack(() => String(value.alt ?? '')));
	let width = $state(untrack(() => String(value.width ?? '')));
	let height = $state(untrack(() => String(value.height ?? '')));

	const listId = $derived(`bibliotheque-${name.replace(/\W+/g, '-')}`);

	function choose(image: LibraryImage) {
		src = image.src;
		width = image.width === undefined ? '' : String(image.width);
		height = image.height === undefined ? '' : String(image.height);
		// La description proposee ne remplace jamais celle qui a ete ecrite : on
		// ne recouvre pas le travail de quelqu'un en changeant de cliche.
		if (alt.trim() === '' && image.alt !== '') alt = image.alt;
	}

	/**
	 * Une adresse saisie a la main ne vient avec aucune dimension.
	 *
	 * Garder celles de l'image precedente serait pire que ne rien avoir : la
	 * page reserverait la mauvaise place et sauterait quand meme.
	 */
	function onSrcInput() {
		const known = library
			.flatMap((group) => group.images)
			.find((image) => image.src === src.trim());

		width = known?.width === undefined ? '' : String(known.width);
		height = known?.height === undefined ? '' : String(known.height);
	}
</script>

<fieldset class="border-ink/12 rounded-field flex flex-col gap-3 border p-4">
	<legend class="px-1 text-sm font-semibold">
		{label}
		{#if required}<span class="text-danger">*</span>{/if}
	</legend>

	{#if help}<p class="text-muted -mt-1 text-xs">{help}</p>{/if}

	<div class="flex flex-wrap items-start gap-4">
		{#if src}
			<img
				{src}
				alt=""
				class="rounded-field border-ink/12 h-24 w-24 border object-cover"
				loading="lazy"
			/>
		{:else}
			<div
				class="border-ink/15 rounded-field text-muted flex h-24 w-24 items-center justify-center border border-dashed text-center text-xs"
			>
				Aucune image
			</div>
		{/if}

		<div class="flex min-w-56 flex-1 flex-col gap-3">
			<label class="flex flex-col gap-1.5">
				<span class="text-sm font-semibold">Adresse de l’image</span>
				<input
					name="{name}.src"
					type="text"
					bind:value={src}
					oninput={onSrcInput}
					list={listId}
					{disabled}
					placeholder="/photos/IMG_2316.JPG"
					class="border-ink/20 bg-paper rounded-field min-h-11 border px-3 py-2"
				/>
			</label>

			<!-- Liste native : sans JavaScript, la saisie propose quand meme les
			     adresses connues du site. -->
			<datalist id={listId}>
				{#each library as group (group.label)}
					{#each group.images as image (image.src)}
						<option value={image.src}>{image.alt || group.label}</option>
					{/each}
				{/each}
			</datalist>

			<label class="flex flex-col gap-1.5">
				<span class="text-sm font-semibold">
					Description de l’image <span class="text-danger">*</span>
				</span>
				<span class="text-muted text-xs">
					Ce qu’on voit, pour qui ne voit pas l’image. Une image sans description ne se publie pas.
				</span>
				<textarea
					name="{name}.alt"
					rows="2"
					bind:value={alt}
					{disabled}
					class="border-ink/20 bg-paper rounded-field min-h-11 border px-3 py-2"
				></textarea>
			</label>
		</div>
	</div>

	<!--
		Les dimensions natives reservent la place de l'image avant son arrivee,
		sans quoi la page saute au chargement. Elles sont remplies toutes seules
		quand l'image vient de la bibliotheque ou d'un televersement ; elles
		restent modifiables pour une image hebergee ailleurs.
	-->
	<div class="flex flex-wrap gap-3">
		<label class="flex flex-col gap-1">
			<span class="text-muted text-xs">Largeur d’origine</span>
			<input
				name="{name}.width"
				type="number"
				bind:value={width}
				{disabled}
				class="border-ink/20 bg-paper rounded-field min-h-11 w-28 border px-3 py-2"
			/>
		</label>
		<label class="flex flex-col gap-1">
			<span class="text-muted text-xs">Hauteur d’origine</span>
			<input
				name="{name}.height"
				type="number"
				bind:value={height}
				{disabled}
				class="border-ink/20 bg-paper rounded-field min-h-11 w-28 border px-3 py-2"
			/>
		</label>
	</div>

	{#if !disabled}
		<details class="border-ink/12 rounded-field border">
			<summary class="cursor-pointer px-3 py-2 text-sm font-semibold">
				Choisir dans la bibliothèque du site
			</summary>

			<div class="flex flex-col gap-4 px-3 pt-1 pb-3">
				{#each library as group (group.label)}
					{#if group.images.length > 0}
						<div>
							<p class="text-muted mb-2 text-xs font-semibold">{group.label}</p>
							<ul class="grid grid-cols-4 gap-2 sm:grid-cols-6">
								{#each group.images as image (image.src)}
									<li>
										<button
											type="button"
											onclick={() => choose(image)}
											aria-pressed={src === image.src}
											title={image.alt || image.src}
											class="rounded-field focus-visible:outline-ink block w-full overflow-hidden border-2 focus-visible:outline-2 focus-visible:outline-offset-2 {src ===
											image.src
												? 'border-coral'
												: 'border-transparent'}"
										>
											<img
												src={image.src}
												alt={image.alt}
												loading="lazy"
												class="aspect-square w-full object-cover"
											/>
										</button>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				{/each}
			</div>
		</details>
	{/if}
</fieldset>
