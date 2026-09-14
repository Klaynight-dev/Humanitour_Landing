<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '$components/admin/PageHeader.svelte';
	import Panel from '$components/admin/Panel.svelte';
	import { formatDate } from '$lib/shared/format';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head><title>Reglages — Back-office</title></svelte:head>

<PageHeader title="Reglages" description="Ce qui s'applique a l'ensemble de la plateforme." />

{#if form?.message}
	<p role="status" class="border-line bg-paper rounded-card mb-5 border px-4 py-3 text-sm">
		{form.message}
	</p>
{/if}

<div class="max-w-2xl">
	<Panel
		title="Seuil d'anonymat"
		description="Tout agregat portant sur moins de repondants que ce seuil est masque, sur le site comme dans l'API."
	>
		<form method="POST" use:enhance class="flex flex-col gap-4">
			<label class="flex flex-col gap-1.5">
				<span class="text-sm font-semibold">Nombre minimal de repondants</span>
				<span class="text-muted text-xs">
					Defaut : {data.defaultThreshold}, la norme de diffusion des donnees locales. Le baisser
					augmente le risque qu'un croisement fin permette de reconnaitre quelqu'un.
				</span>
				<input
					type="number"
					name="threshold"
					min="2"
					required
					value={data.threshold}
					class="border-line w-32 rounded-lg border px-3 py-2"
				/>
			</label>

			<p class="border-coral-200 bg-coral-50 rounded-lg border px-4 py-3 text-sm">
				Le masquage s'applique dans la couche d'agregation, pas a l'affichage : un chiffre masque
				ne peut donc pas fuiter par un export ou par l'API. Une seconde passe masque une case
				supplementaire quand la premiere se retrouverait par soustraction.
			</p>

			<div>
				<button
					type="submit"
					class="bg-ink text-paper hover:bg-coral-600 rounded-pill px-5 py-2.5 text-sm font-semibold transition-colors"
				>
					Enregistrer
				</button>
			</div>

			{#if data.updatedAt}
				<p class="text-muted text-xs">
					Derniere modification le {formatDate(data.updatedAt)}
					{#if data.updatedBy}par {data.updatedBy}{/if}.
				</p>
			{/if}
		</form>
	</Panel>
</div>
