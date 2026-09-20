<script lang="ts">
	import type { FieldProps } from './contract';

	let { field, value = $bindable(), describedBy }: FieldProps = $props();

	const rows = $derived(field.grid?.rows ?? []);
	const columns = $derived(field.grid?.columns ?? []);
	const answers = $derived((value ?? {}) as Record<string, string>);

	function choose(row: string, column: string): void {
		value = { ...answers, [row]: column };
	}
</script>

<!--
	Un vrai tableau, pas une grille CSS : les intitules de ligne et de colonne
	sont des en-tetes, et c'est ce qui permet a un lecteur d'ecran d'annoncer
	« Transports, plutot d'accord » au lieu de « case cochee ».
-->
<div class="overflow-x-auto" aria-describedby={describedBy}>
	<table class="w-full border-collapse text-sm">
		<thead>
			<tr>
				<td></td>
				{#each columns as column (column)}
					<th scope="col" class="px-2 py-2 text-center text-sm font-semibold">{column}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row)}
				<tr class="border-ink/12 border-t">
					<th scope="row" class="py-2 pr-3 text-left text-sm font-normal">{row}</th>
					{#each columns as column (column)}
						<td class="px-2 py-2 text-center">
							<label class="inline-flex min-h-11 min-w-11 items-center justify-center">
								<span class="sr-only">{row} : {column}</span>
								<input
									type="radio"
									name="{field.key}:{row}"
									value={column}
									checked={answers[row] === column}
									onchange={() => choose(row, column)}
									class="accent-ink size-4"
								/>
							</label>
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
