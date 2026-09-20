<script lang="ts">
	import type { FieldProps } from './contract';

	let { field, value = $bindable(), describedBy }: FieldProps = $props();
</script>

<!--
	Les boutons radio ne portent pas `required` : avec `allowOther`, la saisie
	libre remplace le choix, et le navigateur bloquerait l'envoi sur une
	contrainte que le formulaire ne pose pas. La validation vit dans le registre
	partage, et Openforms tranche a la soumission.
-->
<div class="flex flex-col gap-2" aria-describedby={describedBy}>
	{#each field.options as option (option.value)}
		<label class="border-ink/20 bg-paper rounded-field flex min-h-11 cursor-pointer items-center gap-3 border px-3 py-2.5">
			<input
				type="radio"
				name={field.key}
				value={option.value}
				checked={value === option.value}
				onchange={() => (value = option.value)}
				class="accent-ink size-4 shrink-0"
			/>
			<span class="text-base">{option.label}</span>
		</label>
	{/each}
</div>
