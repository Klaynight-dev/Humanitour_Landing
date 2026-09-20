<script lang="ts">
	import { CONTROL_CLASS, type FieldProps } from './contract';

	let { field, value = $bindable(), error, describedBy }: FieldProps = $props();
</script>

<input
	id={field.key}
	name={field.key}
	type="datetime-local"
	value={(value ?? "") as string}
	oninput={(event) => (value = event.currentTarget.value)}
	aria-describedby={describedBy}
	aria-invalid={error ? 'true' : undefined}
	class={CONTROL_CLASS}
/>
