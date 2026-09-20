<script lang="ts">
	import type { FieldProps } from './contract';

	let { field, value = $bindable(), describedBy }: FieldProps = $props();

	const chosen = $derived(Array.isArray(value) ? value : []);

	/** Ajoute ou retire une modalite, sans muter le tableau lie. */
	function toggle(option: string, checked: boolean): void {
		value = checked ? [...chosen, option] : chosen.filter((entry) => entry !== option);
	}
</script>

<div class="flex flex-col gap-2" aria-describedby={describedBy}>
	{#each field.options as option (option.value)}
		<label class="border-ink/20 bg-paper rounded-field flex min-h-11 cursor-pointer items-center gap-3 border px-3 py-2.5">
			<input
				type="checkbox"
				name={field.key}
				value={option.value}
				checked={chosen.includes(option.value)}
				onchange={(event) => toggle(option.value, event.currentTarget.checked)}
				class="accent-ink size-4 shrink-0"
			/>
			<span class="text-base">{option.label}</span>
		</label>
	{/each}
</div>
