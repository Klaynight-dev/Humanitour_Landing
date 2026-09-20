<script lang="ts">
	import RichTextEditor from '$components/admin/RichTextEditor.svelte';
	import { parseRichText } from '$lib/shared/content/richtext';
	import type { ContentField } from '$lib/shared/content/fields';
	import type { LibraryGroup } from '$lib/shared/content/library';
	import ImageField from './ImageField.svelte';
	import ListField from './ListField.svelte';

	interface Props {
		field: ContentField;
		/** Chemin complet du champ, par exemple `data.items.0.term`. */
		name: string;
		value: unknown;
		library: readonly LibraryGroup[];
		disabled: boolean;
	}

	let { field, name, value, library, disabled }: Props = $props();

	/**
	 * Un champ declare devient un champ saisi.
	 *
	 * C'est le seul endroit du back-office qui sait a quoi ressemble chaque
	 * famille de champ. Un type de section ne decrit que ses champs : il ne
	 * choisit pas de balise, ne pose pas de classe, et n'a rien a changer ici
	 * quand il en ajoute un.
	 *
	 * Le nom porte le chemin (`data.items.0.term`) : le formulaire reste plat,
	 * comme HTML l'impose, et le serveur lui rend sa forme (`shared/content/form.ts`).
	 */
	const record = $derived(
		typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
	);

	const text = $derived(typeof value === 'string' || typeof value === 'number' ? String(value) : '');
</script>

{#if field.type === 'image'}
	<ImageField
		{name}
		label={field.label}
		help={field.help}
		required={field.required}
		value={record}
		{library}
		{disabled}
	/>
{:else if field.type === 'list'}
	<ListField {field} {name} {value} {library} {disabled} />
{:else if field.type === 'richtext'}
	<RichTextEditor
		{name}
		label={field.required ? `${field.label} *` : field.label}
		help={field.help}
		doc={parseRichText(value)}
		{disabled}
	/>
{:else}
	<label class="flex flex-col gap-1.5">
		<span class="text-sm font-semibold">
			{field.label}
			{#if field.required}<span class="text-danger">*</span>{/if}
		</span>
		{#if field.help}<span class="text-muted text-xs">{field.help}</span>{/if}

		{#if field.type === 'choice'}
			<!--
				Les variantes de mise en page sont une liste fermee, pas une saisie :
				elles changent le rendu, et une valeur inventee donnerait une section
				sans fond. Le registre en donne les options, le rendu retombe sur son
				repli si l'une disparait.
			-->
			<select
				{name}
				{disabled}
				class="border-ink/20 bg-paper rounded-field min-h-11 border px-3 py-2"
			>
				{#each field.options as option (option.value)}
					<option value={option.value} selected={text === option.value}>{option.label}</option>
				{/each}
			</select>
		{:else if field.type === 'textarea'}
			<textarea
				{name}
				rows="3"
				{disabled}
				class="border-ink/20 bg-paper rounded-field min-h-11 border px-3 py-2">{text}</textarea
			>
		{:else}
			<input
				{name}
				type={field.type === 'number' ? 'number' : 'text'}
				value={text}
				{disabled}
				class="border-ink/20 bg-paper rounded-field min-h-11 border px-3 py-2"
			/>
		{/if}
	</label>
{/if}
