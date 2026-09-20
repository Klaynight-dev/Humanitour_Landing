<script lang="ts">
	import { CONTROL_CLASS, type FieldProps } from './contract';

	let { field, value = $bindable(), error, describedBy }: FieldProps = $props();
</script>

<textarea
	id={field.key}
	name={field.key}
	rows="5"
	value={(value ?? "") as string}
	oninput={(event) => (value = event.currentTarget.value)}
	placeholder={field.placeholder}
	aria-describedby={describedBy}
	aria-invalid={error ? 'true' : undefined}
	maxlength={field.validation?.maxLength}
	class="{CONTROL_CLASS} resize-y"
></textarea>
