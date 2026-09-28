<script lang="ts">
	import { enhance } from '$app/forms';
	import EChart from '$components/explorer/EChart.svelte';
	import Flash from '$components/admin/Flash.svelte';
	import Panel from '$components/admin/Panel.svelte';
	import { formatCount, formatDate, formatDecimal } from '$lib/shared/format';
	import { can } from '$lib/shared/permissions';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const editable = $derived(can(data.user, 'survey.weight'));
	const latest = $derived(data.state);
	const diagnostics = $derived(latest?.diagnostics ?? null);

	let trimEdit: boolean | null = $state(null);
	const trim = $derived(trimEdit ?? data.settings.trim);

	let computing = $state(false);
	let confirmingClear = $state(false);

	const withMissing = $derived(data.integrity.filter((report) => report.missing > 0));
	const untargeted = $derived(data.integrity.filter((report) => report.untargeted.length > 0));
	const stale = $derived((latest?.unweighted ?? 0) > 0);
	const publishBlocked = $derived(stale || !!latest?.marginsChanged);
</script>

<Flash message={form?.message} />

<div class="grid gap-6 lg:grid-cols-[1fr_20rem]">
	<div class="flex flex-col gap-6">
		<Panel
			title="Contrôle d'intégrité"
			description="Vérifié sur les réponses synchronisées à l'instant, avant tout calcul."
		>
			{#if data.variableCount === 0}
				<p class="text-sm">
					Aucune marge enregistrée.
					<a href="/admin/sondages/{data.survey.id}/redressement/marges" class="text-coral-ink underline"
						>Fixez les marges</a
					> avant de calculer.
				</p>
			{:else}
				<ul class="flex flex-col gap-2 text-sm">
					{#each data.integrity as report (report.questionCode)}
						<li class="flex flex-wrap justify-between gap-x-4 gap-y-1">
							<span class="font-medium">{report.label}</span>
							<span class={report.untargeted.length > 0 ? 'text-danger font-semibold' : ''}>
								{#if report.untargeted.length > 0}
									Bloquant : {report.untargeted
										.map((modality) => `« ${modality.label} » (${modality.count})`)
										.join(', ')} sans cible
								{:else if report.missing > 0}
									{formatCount(report.missing)} valeur{report.missing > 1 ? 's' : ''} manquante{report.missing >
									1
										? 's'
										: ''}
								{:else}
									Complète, toutes les modalités ciblées
								{/if}
							</span>
						</li>
					{/each}
				</ul>
				{#if untargeted.length > 0}
					<p class="text-danger mt-3 text-sm">
						Une modalité portée par des répondants doit avoir une cible, sinon le calage ne peut pas
						converger. Corrigez-la dans l'onglet Marges.
					</p>
				{/if}
			{/if}
		</Panel>

		<form
			method="POST"
			action="?/compute"
			use:enhance={() => {
				computing = true;
				return async ({ update }) => {
					await update({ reset: false });
					computing = false;
				};
			}}
		>
			<Panel
				title="Paramètres du calage"
				description="Raking ratio (fonction de distance exponentielle de Deville et Särndal) : les poids restent strictement positifs. Le calcul s'arrête dès que l'écart maximal entre une marge obtenue et sa cible passe sous le seuil ε."
			>
				<div class="flex flex-col gap-5">
					<div class="flex flex-wrap gap-4">
						<label class="flex flex-col gap-1.5">
							<span class="text-sm font-semibold">Seuil de convergence ε</span>
							<input
								name="tolerance"
								inputmode="decimal"
								value={formatDecimal(data.settings.tolerance, 8)}
								disabled={!editable}
								class="border-ink/20 bg-paper rounded-field tabular min-h-11 w-36 border px-3 py-2"
							/>
							<span class="text-muted text-xs">en part : 0,0001 vaut 0,01 point</span>
						</label>
						<label class="flex flex-col gap-1.5">
							<span class="text-sm font-semibold">Itérations au plus</span>
							<input
								name="maxIterations"
								inputmode="numeric"
								value={data.settings.maxIterations}
								disabled={!editable}
								class="border-ink/20 bg-paper rounded-field tabular min-h-11 w-28 border px-3 py-2"
							/>
						</label>
					</div>

					<fieldset class="flex flex-col gap-3">
						<legend class="sr-only">Troncature des poids</legend>
						<label class="flex min-h-11 items-center gap-3">
							<input
								type="checkbox"
								name="trim"
								checked={trim}
								onchange={(event) => (trimEdit = event.currentTarget.checked)}
								disabled={!editable}
								class="size-5"
							/>
							<span class="text-sm font-semibold">Borner les poids (troncature)</span>
						</label>
						<div class="flex flex-wrap gap-4" class:opacity-60={!trim}>
							<label class="flex flex-col gap-1.5">
								<span class="text-sm font-semibold">Borne basse L</span>
								<input
									name="minWeight"
									inputmode="decimal"
									value={formatDecimal(data.settings.minWeight, 4)}
									disabled={!editable}
									class="border-ink/20 bg-paper rounded-field tabular min-h-11 w-28 border px-3 py-2"
								/>
							</label>
							<label class="flex flex-col gap-1.5">
								<span class="text-sm font-semibold">Borne haute U</span>
								<input
									name="maxWeight"
									inputmode="decimal"
									value={formatDecimal(data.settings.maxWeight, 4)}
									disabled={!editable}
									class="border-ink/20 bg-paper rounded-field tabular min-h-11 w-28 border px-3 py-2"
								/>
							</label>
						</div>
						<p class="text-muted text-xs">
							{#if trim}
								Aucun répondant ne pèsera moins de {formatDecimal(data.settings.minWeight, 4)} ni plus de
								{formatDecimal(data.settings.maxWeight, 4)} répondants moyens. Borner protège d'un répondant
								rare qui ferait à lui seul le résultat, au prix d'un écart résiduel aux cibles, que le diagnostic
								chiffre.
							{:else}
								Sans bornes, les marges sont atteintes exactement, mais un répondant rare peut recevoir un
								poids très élevé. Surveillez le rapport w max / w min dans l'onglet Qualité.
							{/if}
						</p>
					</fieldset>

					{#if withMissing.length > 0}
						<label class="border-ink/20 rounded-field flex items-start gap-3 border p-3">
							<input
								type="checkbox"
								name="acceptMissing"
								disabled={!editable}
								class="mt-0.5 size-5 shrink-0"
							/>
							<span class="text-sm">
								Je constate les valeurs manquantes sur {withMissing
									.map((report) => `« ${report.label} » (${formatCount(report.missing)})`)
									.join(', ')}. Ces répondants sont gardés, avec un poids neutre sur la variable
								concernée ; la note méthodologique le mentionnera.
							</span>
						</label>
					{/if}
				</div>

				{#snippet footer()}
					{#if editable}
						<div class="flex flex-wrap items-center gap-3">
							<button
								type="submit"
								disabled={computing || data.variableCount === 0}
								class="bg-ink text-paper press rounded-pill inline-flex min-h-11 items-center px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
							>
								{computing ? 'Calcul en cours…' : 'Lancer le calcul'}
							</button>
							<p class="text-muted text-xs" aria-live="polite">
								{computing
									? `Calage de ${formatCount(data.respondents)} répondants, puis écriture des poids.`
									: 'Chaque calcul crée une nouvelle version, consignée au journal.'}
							</p>
						</div>
					{/if}
				{/snippet}
			</Panel>
		</form>

		<Panel
			title="Convergence du dernier calcul"
			description="Écart maximal restant entre une marge obtenue et sa cible, après chaque itération, sur une échelle logarithmique. La courbe doit passer sous le trait du seuil ε."
		>
			{#if !data.convergence}
				<p class="text-muted text-sm">
					{latest
						? "Ce calcul date d'avant l'enregistrement de la trace : relancez-le pour la voir."
						: 'Aucun calcul pour le moment.'}
				</p>
			{:else}
				<EChart
					svg={data.convergence.svg}
					option={data.convergence.option}
					height={data.convergence.height}
					label="Écart maximal aux cibles par itération, de {formatDecimal(
						(data.history[0]?.maxDeviation ?? 0) * 100,
						4
					)} à {formatDecimal((data.history.at(-1)?.maxDeviation ?? 0) * 100, 4)} point"
				/>
				<details class="mt-3 text-sm">
					<summary class="text-coral-ink min-h-11 cursor-pointer py-2 underline"
						>Voir les {data.history.length} itérations en tableau</summary
					>
					<table class="mt-2 w-full max-w-sm text-sm">
						<thead class="text-muted text-left text-xs">
							<tr>
								<th scope="col" class="py-1 pr-3 font-semibold">Itération</th>
								<th scope="col" class="py-1 pl-3 text-right font-semibold">Écart maximal</th>
							</tr>
						</thead>
						<tbody>
							{#each data.history as step (step.iteration)}
								<tr class="border-ink/10 border-t">
									<td class="tabular py-1 pr-3">{step.iteration}</td>
									<td class="tabular py-1 pl-3 text-right"
										>{formatDecimal(step.maxDeviation * 100, 4)} pt</td
									>
								</tr>
							{/each}
						</tbody>
					</table>
				</details>
			{/if}
		</Panel>
	</div>

	<aside class="flex flex-col gap-6">
		<Panel title="Dernier calcul">
			{#if !latest || !diagnostics}
				<p class="text-muted text-sm">
					Aucun poids calculé. Rien n'est publié tant que vous ne le décidez pas.
				</p>
			{:else}
				<dl class="flex flex-col gap-2.5 text-sm">
					<div class="flex justify-between gap-3">
						<dt class="text-muted">Version</dt>
						<dd class="tabular font-semibold">{latest.version}</dd>
					</div>
					<div class="flex justify-between gap-3">
						<dt class="text-muted">Calculée le</dt>
						<dd class="text-right">{formatDate(latest.computedAt)}</dd>
					</div>
					<div class="flex justify-between gap-3">
						<dt class="text-muted">Convergence</dt>
						<dd class={diagnostics.converged ? 'font-semibold' : 'text-danger font-semibold'}>
							{diagnostics.converged ? 'Oui' : 'Non'}, {diagnostics.iterations} itération{diagnostics.iterations >
							1
								? 's'
								: ''}
						</dd>
					</div>
					<div class="flex justify-between gap-3">
						<dt class="text-muted">Écart maximal</dt>
						<dd class="tabular">{formatDecimal(diagnostics.maxDeviation * 100, 3)} pt</dd>
					</div>
				</dl>
				<a
					href="/admin/sondages/{data.survey.id}/redressement/qualite"
					class="text-coral-ink mt-3 inline-block text-sm underline">Lire le tableau de bord qualité</a
				>
			{/if}
		</Panel>

		{#if latest}
			<Panel title="Publication">
				<p class="text-sm">
					{#if latest.isPublished}
						Proposée au public depuis le {formatDate(latest.publishedAt)}, comme seconde lecture à côté
						des données brutes.
					{:else}
						Non publiée : le site public n'affiche que les données brutes.
					{/if}
				</p>

				{#if !latest.isPublished && publishBlocked}
					<p class="text-danger mt-2 text-sm">
						{stale
							? 'Des réponses sont arrivées depuis ce calcul : relancez-le avant de publier.'
							: 'Les marges ont changé depuis ce calcul : relancez-le avant de publier.'}
					</p>
				{/if}

				{#if editable}
					<div class="mt-4 flex flex-wrap gap-2">
						{#if latest.isPublished}
							<form method="POST" action="?/unpublish" use:enhance>
								<button
									type="submit"
									class="border-ink/25 bg-paper press rounded-pill inline-flex min-h-11 items-center border px-4 py-2 text-sm"
								>
									Retirer du site
								</button>
							</form>
						{:else}
							<form method="POST" action="?/publish" use:enhance>
								<button
									type="submit"
									disabled={publishBlocked}
									class="bg-ink text-paper press rounded-pill inline-flex min-h-11 items-center px-4 py-2 text-sm font-semibold disabled:opacity-50"
								>
									Publier la lecture redressée
								</button>
							</form>
						{/if}

						{#if confirmingClear}
							<form
								method="POST"
								action="?/clear"
								use:enhance={() => {
									confirmingClear = false;
									return async ({ update }) => update();
								}}
								class="flex flex-wrap gap-2"
							>
								<button
									type="submit"
									class="bg-danger text-paper press rounded-pill inline-flex min-h-11 items-center px-4 py-2 text-sm font-semibold"
								>
									Confirmer l'effacement
								</button>
								<button
									type="button"
									onclick={() => (confirmingClear = false)}
									class="border-ink/25 bg-paper press rounded-pill inline-flex min-h-11 items-center border px-4 py-2 text-sm"
								>
									Annuler
								</button>
							</form>
						{:else}
							<button
								type="button"
								onclick={() => (confirmingClear = true)}
								class="border-ink/25 text-danger bg-paper press rounded-pill inline-flex min-h-11 items-center border px-4 py-2 text-sm"
							>
								Effacer les poids
							</button>
						{/if}
					</div>
				{/if}

				{#if data.survey.status === 'PUBLISHED' && latest.isPublished}
					<a
						href="/donnees/{data.survey.slug}?lecture=redresse"
						class="text-coral-ink mt-4 inline-block text-sm underline"
					>
						Voir la lecture redressée
					</a>
				{/if}
			</Panel>
		{/if}
	</aside>
</div>
