<script lang="ts">
	import type { FieldProps } from './contract';

	let { field }: FieldProps = $props();
</script>

<div class="bg-cream rounded-panel p-4">
	<p class="font-semibold">{field.label}</p>
	{#if field.description}
		<p class="text-muted mt-1 text-sm">{field.description}</p>
	{/if}
</div>
