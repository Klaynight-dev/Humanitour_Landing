<script lang="ts">
	import { scaleBounds } from '$lib/shared/openforms/fields/linear-scale';
	import type { FieldProps } from './contract';

	let { field, value = $bindable(), describedBy }: FieldProps = $props();

	/**
	 * Une echelle se rend en boutons radio, pas en curseur.
	 *
	 * Un curseur part d'une valeur par defaut visible : le repondant qui n'y
	 * touche pas a pourtant l'air d'avoir repondu, et sa non-reponse devient un
	 * milieu d'echelle. C'est exactement l'« illusion de la reponse universelle »
	 * reprochee aux instituts (AGENTS.md section 0).
	 */
	const steps = $derived.by(() => {
		const { min, max } = scaleBounds(field);
		return Array.from({ length: max - min + 1 }, (_, index) => min + index);
	});
</script>

<div class="flex flex-wrap gap-2" aria-describedby={describedBy}>
	{#each steps as step (step)}
		<label
			class="border-ink/20 bg-paper rounded-field flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 border px-3 py-2.5"
		>
			<input
				type="radio"
				name={field.key}
				value={String(step)}
				checked={value === String(step)}
				onchange={() => (value = String(step))}
				class="accent-ink size-4 shrink-0"
			/>
			<span class="tabular text-base">{step}</span>
		</label>
	{/each}
</div>
