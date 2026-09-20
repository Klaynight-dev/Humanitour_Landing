<script lang="ts">
	import type { FieldValue, OpenformsField } from '$lib/shared/openforms/types';
	import { getFieldWidget } from './fields/index';

	interface Props {
		field: OpenformsField;
		/** Voir `fields/contract.ts` : une cle absente de l'etat vaut un vide. */
		value: FieldValue | undefined;
		error?: string;
	}

	let { field, value = $bindable(), error }: Props = $props();

	const widget = $derived(getFieldWidget(field.type));

	// Les identifiants sont derives de la cle du champ, qui est deja unique dans
	// le formulaire : pas besoin d'un compteur, et ils restent stables entre le
	// rendu serveur et la reprise cote client.
	const helpId = $derived(field.description ? `${field.key}-aide` : null);
	const errorId = $derived(error ? `${field.key}-erreur` : null);
	const describedBy = $derived([helpId, errorId].filter(Boolean).join(' ') || undefined);
</script>

{#if !widget}
	<!--
		Type inconnu ou volontairement exclu. Rien ne s'affiche : la page publique
		ne sert un questionnaire que lorsque `inspectForm` l'a declare servable,
		donc arriver ici signifie qu'un champ facultatif a ete ecarte, ce que le
		back-office a deja signale a l'equipe.
	-->
{:else if widget.standalone}
	<widget.component {field} bind:value {error} {describedBy} />
{:else if widget.grouped}
	<fieldset class="flex flex-col gap-2">
		<legend class="text-base font-semibold">
			{field.label}
			{#if field.required}<span class="sr-only"> (obligatoire)</span><span aria-hidden="true">&nbsp;*</span>{/if}
		</legend>
		{#if field.description}
			<p id={helpId} class="text-muted text-sm">{field.description}</p>
		{/if}
		<widget.component {field} bind:value {error} {describedBy} />
		{#if error}
			<p id={errorId} class="text-sm font-semibold">{error}</p>
		{/if}
	</fieldset>
{:else}
	<div class="flex flex-col gap-2">
		<label for={field.key} class="text-base font-semibold">
			{field.label}
			{#if field.required}<span class="sr-only"> (obligatoire)</span><span aria-hidden="true">&nbsp;*</span>{/if}
		</label>
		{#if field.description}
			<p id={helpId} class="text-muted text-sm">{field.description}</p>
		{/if}
		<widget.component {field} bind:value {error} {describedBy} />
		{#if error}
			<p id={errorId} class="text-sm font-semibold">{error}</p>
		{/if}
	</div>
{/if}
