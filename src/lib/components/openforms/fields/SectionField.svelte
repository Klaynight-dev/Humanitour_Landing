<script lang="ts">
	import type { FieldProps } from './contract';

	let { field }: FieldProps = $props();
</script>

<!--
	Un titre de section n'est pas un champ : il n'a ni controle, ni libelle
	associe. `Field.svelte` ne lui en pose donc pas, et le titre est rendu ici.
-->
<h2 class="border-ink/12 mt-4 border-t pt-6 text-xl font-semibold">{field.label}</h2>
{#if field.description}
	<p class="text-muted mt-1">{field.description}</p>
{/if}
