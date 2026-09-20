<script lang="ts">
	import { untrack } from 'svelte';
	import FieldInput from '$components/admin/content/FieldInput.svelte';
	import { readNested } from '$lib/shared/content/form';
	import { getContentBlockType } from '$lib/shared/content';
	import type { LibraryGroup } from '$lib/shared/content/library';

	interface Props {
		type: string;
		data: Record<string, unknown>;
		library: readonly LibraryGroup[];
		disabled: boolean;
		/** Appele a chaque frappe, avec la section relue et validee. */
		onchange: (result: { ok: true; data: Record<string, unknown> } | { ok: false; reason: string }) => void;
	}

	let { type, data, library, disabled, onchange }: Props = $props();

	const definition = $derived(getContentBlockType(type));

	/**
	 * Point de depart de la saisie, fige une fois pour toutes.
	 *
	 * Les champs ne sont PAS pilotes par `data` : ils sont poses une fois, et ce
	 * sont eux qui font foi ensuite. Les repiloter a chaque frappe replacerait le
	 * curseur au bout du champ a chaque caractere, puisque la valeur renvoyee est
	 * celle qui vient d'etre relue. Meme raison que dans `ListField` et
	 * `ImageField`.
	 *
	 * Le composant est recree a chaque changement de section (`{#key}` chez
	 * l'appelant), donc cette photographie est toujours celle de la bonne section.
	 */
	const initial = untrack(() => data);

	let form: HTMLFormElement | undefined = $state();

	/**
	 * Le formulaire vers la section.
	 *
	 * `readNested` est la meme fonction que celle du serveur : le nom d'un champ
	 * porte son chemin (`data.items.0.term`) des deux cotes, et l'apercu ne peut
	 * donc pas montrer autre chose que ce qui sera enregistre.
	 *
	 * L'evenement remonte aussi de l'editeur de texte enrichi, dont la zone
	 * editable emet `input` en bouillonnant : son champ cache est deja a jour
	 * quand on arrive ici.
	 */
	function sync() {
		if (!form || !definition) return;

		const parsed = definition.parseData(readNested(new FormData(form), 'data'));
		onchange(parsed.ok ? { ok: true, data: parsed.data } : { ok: false, reason: parsed.reason });
	}
</script>

{#if !definition}
	<p class="text-warning text-sm">
		Cette section utilise un type qui n'existe plus (« {type} »). Elle n'est plus modifiable,
		seulement supprimable.
	</p>
{:else}
	<!--
		Un `form` qui n'est jamais soumis : il sert de conteneur a `FormData`, ce
		qui evite de parcourir les champs a la main et donne les memes noms qu'a
		l'enregistrement. L'enregistrement, lui, part du bandeau du haut avec la
		page entiere.
	-->
	<form bind:this={form} oninput={sync} onchange={sync} class="flex flex-col gap-4">
		{#each definition.fields as field (field.name)}
			<FieldInput
				{field}
				name="data.{field.name}"
				value={initial[field.name]}
				{library}
				{disabled}
			/>
		{/each}

		{#if definition.fields.length === 0}
			<p class="text-muted text-sm">Cette section n'a aucun champ : elle s'affiche telle quelle.</p>
		{/if}
	</form>
{/if}
