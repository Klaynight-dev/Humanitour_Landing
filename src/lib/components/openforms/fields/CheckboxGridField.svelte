<script lang="ts">
	import type { FieldProps } from './contract';

	let { field, value = $bindable(), describedBy }: FieldProps = $props();

	const rows = $derived(field.grid?.rows ?? []);
	const columns = $derived(field.grid?.columns ?? []);
	const answers = $derived((value ?? {}) as Record<string, string>);

	/** Les colonnes cochees d'une ligne, telles que la valeur les stocke. */
	function checked(row: string): string[] {
		const raw = answers[row] ?? '';
		return raw === '' ? [] : raw.split(';').map((entry) => entry.trim());
	}

	function toggle(row: string, column: string, on: boolean): void {
		const current = checked(row);
		const next = on ? [...current, column] : current.filter((entry) => entry !== column);
		value = { ...answers, [row]: next.join('; ') };
	}
</script>

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
									type="checkbox"
									name="{field.key}:{row}"
									value={column}
									checked={checked(row).includes(column)}
									onchange={(event) => toggle(row, column, event.currentTarget.checked)}
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
