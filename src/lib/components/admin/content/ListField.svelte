<script lang="ts">
	import { untrack } from 'svelte';
	import type { ContentField } from '$lib/shared/content/fields';
	import type { LibraryGroup } from '$lib/shared/content/library';
	import FieldInput from './FieldInput.svelte';

	interface Props {
		field: ContentField & { type: 'list' };
		name: string;
		value: unknown;
		library: readonly LibraryGroup[];
		disabled: boolean;
	}

	let { field, name, value, library, disabled }: Props = $props();

	/**
	 * Une serie repetable : les quatre questions, les cinq engagements, les
	 * lignes d'un tableau.
	 *
	 * Les lignes sont numerotees dans le nom des champs (`…items.0.value`), et
	 * ce rang n'est qu'un ordre de saisie : le serveur resserre les trous
	 * laisses par une ligne retiree. C'est ce qui permet de supprimer une ligne
	 * sans renumeroter les autres, et sans requete.
	 *
	 * Sans JavaScript, les lignes existantes restent modifiables et
	 * enregistrables : vider tous les champs d'une ligne la supprime, puisqu'une
	 * ligne entierement vide est ecartee a la validation. Seuls l'ajout et le
	 * deplacement demandent le script.
	 */
	/* Point de depart de la saisie : ensuite, ce sont les lignes a l'ecran qui
	   font foi. Voir la meme remarque dans `ImageField`. */
	const initial = untrack(() => (Array.isArray(value) ? (value as Record<string, unknown>[]) : []));

	/** Une cle par ligne, stable : sans elle, retirer la premiere ligne referait
	    tous les champs des suivantes et la saisie en cours sauterait. */
	let nextKey = initial.length;
	let rows = $state(initial.map((item, index) => ({ key: index, item })));

	const full = $derived(field.max !== undefined && rows.length >= field.max);

	function add() {
		rows = [...rows, { key: nextKey++, item: {} }];
	}

	function remove(key: number) {
		rows = rows.filter((row) => row.key !== key);
	}

	function move(index: number, direction: 1 | -1) {
		const target = index + direction;
		if (target < 0 || target >= rows.length) return;

		const next = [...rows];
		const held = next[index]!;
		next[index] = next[target]!;
		next[target] = held;
		rows = next;
	}
</script>

<fieldset class="border-ink/12 rounded-field flex flex-col gap-3 border p-4">
	<legend class="px-1 text-sm font-semibold">
		{field.label}
		{#if field.required}<span class="text-danger">*</span>{/if}
	</legend>

	{#if field.help}<p class="text-muted -mt-1 text-xs">{field.help}</p>{/if}

	{#if rows.length === 0}
		<p class="text-muted text-sm">Aucun élément.</p>
	{/if}

	{#each rows as row, index (row.key)}
		<div class="border-ink/10 bg-cream/40 rounded-field flex flex-col gap-3 border p-3">
			<div class="flex items-center justify-between gap-2">
				<span class="text-muted text-xs font-semibold">{index + 1}</span>

				{#if !disabled}
					<div class="flex gap-1">
						<button
							type="button"
							onclick={() => move(index, -1)}
							disabled={index === 0}
							aria-label="Monter l’élément {index + 1}"
							class="border-ink/20 bg-paper press rounded-pill inline-flex min-h-9 items-center border px-2 text-sm disabled:opacity-30"
						>
							↑
						</button>
						<button
							type="button"
							onclick={() => move(index, 1)}
							disabled={index === rows.length - 1}
							aria-label="Descendre l’élément {index + 1}"
							class="border-ink/20 bg-paper press rounded-pill inline-flex min-h-9 items-center border px-2 text-sm disabled:opacity-30"
						>
							↓
						</button>
						<button
							type="button"
							onclick={() => remove(row.key)}
							aria-label="Retirer l’élément {index + 1}"
							class="border-ink/20 text-danger bg-paper press rounded-pill inline-flex min-h-9 items-center border px-3 text-sm"
						>
							Retirer
						</button>
					</div>
				{/if}
			</div>

			{#each field.item as sub (sub.name)}
				<FieldInput
					field={sub}
					name="{name}.{index}.{sub.name}"
					value={row.item[sub.name]}
					{library}
					{disabled}
				/>
			{/each}
		</div>
	{/each}

	{#if !disabled}
		<div class="flex items-center gap-3">
			<button
				type="button"
				onclick={add}
				disabled={full}
				class="border-ink/25 bg-paper press rounded-pill inline-flex min-h-11 items-center border px-4 py-2 text-sm font-semibold disabled:opacity-40"
			>
				Ajouter {field.itemLabel}
			</button>

			{#if full}
				<!-- Le plafond vient de la mise en page, pas d'une limite technique :
				     une cinquieme colonne casserait la rangee. -->
				<span class="text-muted text-xs">
					Cette mise en page en accepte {field.max} au maximum.
				</span>
			{/if}
		</div>
	{/if}
</fieldset>
