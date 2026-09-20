<script lang="ts">
	import { CONTROL_CLASS, type FieldProps } from './contract';

	let { field, value = $bindable(), error, describedBy }: FieldProps = $props();
</script>

<select
	id={field.key}
	name={field.key}
	value={(value ?? "") as string}
	onchange={(event) => (value = event.currentTarget.value)}
	aria-describedby={describedBy}
	aria-invalid={error ? 'true' : undefined}
	class={CONTROL_CLASS}
>
	<option value="">Choisir…</option>
	{#each field.options as option (option.value)}
		<option value={option.value}>{option.label}</option>
	{/each}
</select>
