<script module lang="ts">
	export interface ComposerValues {
		to: string;
		cc: string;
		bcc: string;
		subject: string;
		markdown: string;
	}
</script>

<script lang="ts">
	import type { SubmitFunction } from '@sveltejs/kit';
	import { enhance } from '$app/forms';
	import { checkAttachments, formatBytes } from '$lib/shared/mail/attachments';

	interface Props {
		/** Action de formulaire, `?/send` par exemple. */
		action: string;
		/** L'expediteur affiche : « Humanitour <contact@humanitour.fr> ». */
		from: string;
		values: ComposerValues;
		/** Champs caches propres a l'ecran : mode de reponse, message cite. */
		hidden?: Record<string, string>;
		/** Signature de la boite, rappelee sous le texte. */
		signature?: string | null;
		/** Ce que le message emporte sans qu'on l'ajoute : pieces jointes transferees. */
		note?: string | null;
		submitLabel?: string;
		disabled?: boolean;
		onCancel?: () => void;
		onSent?: () => void;
	}

	let {
		action,
		from,
		values,
		hidden = {},
		signature = null,
		note = null,
		submitLabel = 'Envoyer',
		disabled = false,
		onCancel,
		onSent
	}: Props = $props();

	// Etat local initialise depuis les valeurs recues : le parent les change
	// quand on passe de « Repondre » a « Transferer ».
	let to = $state('');
	let cc = $state('');
	let bcc = $state('');
	let subject = $state('');
	let markdown = $state('');
	let showCopies = $state(false);
	$effect.pre(() => {
		to = values.to;
		cc = values.cc;
		bcc = values.bcc;
		subject = values.subject;
		markdown = values.markdown;
		showCopies = values.cc !== '' || values.bcc !== '';
	});

	let files: File[] = $state([]);
	let sending = $state(false);

	const fileError = $derived(checkAttachments(files));

	function onFiles(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		files = [...(input.files ?? [])];
	}

	const submit: SubmitFunction = ({ cancel }) => {
		if (fileError) {
			cancel();
			return;
		}
		sending = true;
		return async ({ result, update }) => {
			await update({ reset: false });
			sending = false;
			if (result.type === 'success' || result.type === 'redirect') onSent?.();
		};
	};

	const field = 'border-ink/20 bg-paper rounded-field min-h-11 w-full border px-3 py-2 text-sm';
</script>

<form
	method="POST"
	{action}
	enctype="multipart/form-data"
	use:enhance={submit}
	class="flex flex-col gap-3"
>
	{#each Object.entries(hidden) as [name, value] (name)}
		<input type="hidden" {name} {value} />
	{/each}

	<p class="text-muted text-sm">De : <span class="text-ink">{from}</span></p>

	<label class="grid gap-1 sm:grid-cols-[4rem_1fr] sm:items-center">
		<span class="text-sm font-semibold">À</span>
		<input
			name="to"
			bind:value={to}
			required
			autocomplete="off"
			class={field}
			placeholder="adresse@exemple.fr, autre@exemple.fr"
		/>
	</label>

	{#if showCopies}
		<label class="grid gap-1 sm:grid-cols-[4rem_1fr] sm:items-center">
			<span class="text-sm font-semibold">Cc</span>
			<input name="cc" bind:value={cc} autocomplete="off" class={field} />
		</label>
		<label class="grid gap-1 sm:grid-cols-[4rem_1fr] sm:items-center">
			<span class="text-sm font-semibold">Cci</span>
			<input name="bcc" bind:value={bcc} autocomplete="off" class={field} />
		</label>
	{:else}
		<button
			type="button"
			onclick={() => (showCopies = true)}
			class="self-start text-sm underline decoration-2 underline-offset-2 sm:ml-16"
		>
			Ajouter Cc ou Cci
		</button>
	{/if}

	<label class="grid gap-1 sm:grid-cols-[4rem_1fr] sm:items-center">
		<span class="text-sm font-semibold">Objet</span>
		<input name="subject" bind:value={subject} required maxlength="250" class={field} />
	</label>

	<label class="flex flex-col gap-1">
		<span class="sr-only">Message</span>
		<textarea
			name="markdown"
			bind:value={markdown}
			required
			rows="10"
			class="{field} leading-relaxed"
			placeholder="Votre message. **gras**, *italique*, [lien](https://…) et listes « - » sont mis en forme."
		></textarea>
	</label>

	{#if signature}
		<p class="text-muted text-xs whitespace-pre-line">Signature ajoutée : {signature}</p>
	{/if}
	{#if note}
		<p class="text-muted text-xs">{note}</p>
	{/if}

	<div class="flex flex-col gap-1">
		<label class="text-sm">
			<span class="font-semibold">Pièces jointes</span>
			<input
				type="file"
				name="files"
				multiple
				onchange={onFiles}
				class="mt-1 block w-full text-sm"
			/>
		</label>
		{#if files.length > 0}
			<ul class="text-muted text-xs">
				{#each files as file (file.name + file.size)}
					<li>{file.name} · {formatBytes(file.size)}</li>
				{/each}
			</ul>
		{/if}
		{#if fileError}
			<p class="text-danger text-sm" role="alert">{fileError}</p>
		{/if}
	</div>

	<div class="flex flex-wrap gap-2">
		<button
			type="submit"
			disabled={disabled || sending || fileError !== null}
			class="bg-ink text-paper press rounded-pill inline-flex min-h-11 items-center px-5 py-2 text-sm font-semibold disabled:opacity-60"
		>
			{sending ? 'Envoi…' : submitLabel}
		</button>
		{#if onCancel}
			<button
				type="button"
				onclick={onCancel}
				class="border-ink/25 bg-paper press rounded-pill inline-flex min-h-11 items-center border px-4 py-2 text-sm"
			>
				Annuler
			</button>
		{/if}
	</div>
</form>
