<script lang="ts">
	import { enhance } from '$app/forms';
	import Flash from '$components/admin/Flash.svelte';
	import PageHeader from '$components/admin/PageHeader.svelte';
	import Panel from '$components/admin/Panel.svelte';
	import { formatCount, formatDate, formatShare } from '$lib/shared/format';
	import { can } from '$lib/shared/permissions';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const editable = $derived(can(data.user, 'survey.weight'));

	/** Questions cochees comme variables de calage, reinitialisees a chaque rechargement. */
	let selected: readonly string[] = $derived(
		data.questions.filter((question) => question.selected).map((question) => question.code)
	);

	function toggle(code: string, checked: boolean): void {
		const others = selected.filter((candidate) => candidate !== code);
		selected = checked ? [...others, code] : others;
	}

	let confirmingClear = $state(false);

	const DECIMAL = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

	/** Part en base (0 a 1) vers la valeur d un champ en pourcentage. */
	function percentValue(share: number | null): string {
		return share === null ? '' : DECIMAL.format(share * 100);
	}

	/** Ecart entre obtenu et cible, en points. */
	function gap(weighted: number | null, target: number | null): string {
		if (weighted === null || target === null) return '';
		const points = (weighted - target) * 100;
		const sign = points > 0.05 ? '+' : points < -0.05 ? '−' : '';
		return `${sign}${DECIMAL.format(Math.abs(points))} pt`;
	}

	function isFar(weighted: number | null, target: number | null): boolean {
		return weighted !== null && target !== null && Math.abs(weighted - target) > 0.01;
	}

	const latest = $derived(data.state);
	const stale = $derived((latest?.unweighted ?? 0) > 0);
</script>

<svelte:head><title>Redressement, {data.survey.title} — Back-office</title></svelte:head>

<PageHeader
	title="Redressement"
	breadcrumb={[
		{ label: 'Sondages', href: '/admin/sondages' },
		{ label: data.survey.title, href: `/admin/sondages/${data.survey.id}` }
	]}
	description="Calage sur marges : chaque répondant reçoit un poids pour que l'échantillon rejoigne les parts de la population que vous saisissez. La lecture brute reste celle affichée par défaut."
/>

<Flash message={form?.message} />

<div class="grid gap-6 lg:grid-cols-[1fr_20rem]">
	<form
		method="POST"
		action="?/save"
		use:enhance={() =>
			async ({ update }) =>
				update({ reset: false })}
		class="flex flex-col gap-6"
	>
		<Panel
			title="Marges cibles"
			description="Cochez les questions sur lesquelles caler, puis saisissez la part de chaque modalité dans la population, en pourcentage. Seules les questions à réponse unique peuvent porter un calage."
		>
			{#if data.questions.length === 0}
				<p class="text-muted text-sm">
					Aucune question de cette enquête ne peut porter un calage : il faut une question à choix
					unique, croisable, avec des modalités déclarées (sexe, tranche d'âge, région…).
				</p>
			{:else}
				<div class="flex flex-col gap-5">
					{#each data.questions as question (question.code)}
						<fieldset class="border-ink/20 rounded-field border p-4">
							<legend class="sr-only">{question.label}</legend>
							<label class="flex min-h-11 items-center gap-3">
								<input
									type="checkbox"
									name="variable"
									value={question.code}
									checked={selected.includes(question.code)}
									onchange={(event) => toggle(question.code, event.currentTarget.checked)}
									disabled={!editable}
									class="size-5"
								/>
								<span class="font-medium">{question.label}</span>
								<code class="bg-cream text-muted rounded px-1.5 py-0.5 text-xs"
									>{question.code}</code
								>
							</label>

							<div class="mt-3 overflow-x-auto">
								<table class="w-full min-w-[32rem] text-sm">
									<thead class="text-muted text-left text-xs">
										<tr>
											<th scope="col" class="py-1.5 pr-3 font-semibold">Modalité</th>
											<th scope="col" class="px-3 py-1.5 text-right font-semibold">Échantillon</th>
											<th scope="col" class="px-3 py-1.5 text-right font-semibold">Cible</th>
											<th scope="col" class="px-3 py-1.5 text-right font-semibold">Redressé</th>
											<th scope="col" class="py-1.5 pl-3 text-right font-semibold">Écart</th>
										</tr>
									</thead>
									<tbody>
										{#each question.rows as row (row.key)}
											<tr class="border-ink/10 border-t">
												<td class="py-1.5 pr-3">{row.label}</td>
												<td class="tabular px-3 py-1.5 text-right">{formatShare(row.observed)}</td>
												<td class="px-3 py-1.5 text-right">
													{#if selected.includes(question.code)}
														<label class="inline-flex items-center gap-1">
															<span class="sr-only">Cible pour « {row.label} », en pourcentage</span
															>
															<input
																name="cible:{question.code}:{row.key}"
																inputmode="decimal"
																value={percentValue(row.target)}
																disabled={!editable}
																class="border-ink/20 bg-paper rounded-field tabular min-h-11 w-24 border px-2 py-1 text-right"
															/>
															<span class="text-muted">%</span>
														</label>
													{:else}
														<span class="text-muted">—</span>
													{/if}
												</td>
												<td class="tabular px-3 py-1.5 text-right">
													{row.weighted === null ? '—' : formatShare(row.weighted)}
												</td>
												<td
													class="tabular py-1.5 pl-3 text-right {isFar(row.weighted, row.target)
														? 'text-danger font-semibold'
														: 'text-muted'}"
												>
													{gap(row.weighted, row.target)}
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>

							{#if question.unknown > 0}
								<p class="text-muted mt-2 text-xs">
									{formatCount(question.unknown)} répondant{question.unknown > 1 ? 's' : ''} sans réponse
									à cette question : {question.unknown > 1 ? 'ils gardent' : 'il garde'} leur poids sur
									cette variable, aucune source ne donnant la part des « sans réponse » dans la population.
								</p>
							{/if}
						</fieldset>
					{/each}
				</div>
			{/if}
		</Panel>

		<Panel
			title="Source et bornes"
			description="La source est publiée avec les chiffres redressés : un redressement dont on ne dit pas d'où viennent les marges ne vaut pas mieux qu'un redressement caché."
		>
			<div class="flex flex-col gap-4">
				<label class="flex flex-col gap-1.5">
					<span class="text-sm font-semibold">Source des marges</span>
					<input
						name="source"
						value={data.settings.source}
						placeholder="Insee, recensement de la population 2021, France métropolitaine, 18 ans et plus"
						disabled={!editable}
						class="border-ink/20 bg-paper rounded-field min-h-11 border px-3 py-2"
					/>
				</label>

				<div class="flex flex-wrap gap-4">
					<label class="flex flex-col gap-1.5">
						<span class="text-sm font-semibold">Poids plancher</span>
						<input
							name="minWeight"
							inputmode="decimal"
							value={DECIMAL.format(data.settings.minWeight)}
							disabled={!editable}
							class="border-ink/20 bg-paper rounded-field tabular min-h-11 w-28 border px-3 py-2"
						/>
					</label>
					<label class="flex flex-col gap-1.5">
						<span class="text-sm font-semibold">Poids plafond</span>
						<input
							name="maxWeight"
							inputmode="decimal"
							value={DECIMAL.format(data.settings.maxWeight)}
							disabled={!editable}
							class="border-ink/20 bg-paper rounded-field tabular min-h-11 w-28 border px-3 py-2"
						/>
					</label>
				</div>
				<p class="text-muted text-xs">
					Un poids de 5 fait compter un répondant comme cinq répondants moyens. Relever le plafond
					rapproche les marges de leur cible, au prix d'une précision plus faible : la taille
					effective, à droite, dit combien.
				</p>
			</div>

			{#snippet footer()}
				{#if editable}
					<button
						type="submit"
						class="bg-ink text-paper press rounded-pill inline-flex min-h-11 items-center justify-center px-5 py-2.5 text-sm font-semibold"
					>
						Enregistrer et calculer
					</button>
				{/if}
			{/snippet}
		</Panel>
	</form>

	<aside class="flex flex-col gap-6">
		<Panel title="Dernier calcul">
			{#if !latest}
				<p class="text-muted text-sm">
					Aucun poids calculé. Saisissez des marges et lancez un calcul : rien n'est publié tant que
					vous ne le décidez pas.
				</p>
			{:else}
				<dl class="flex flex-col gap-2.5 text-sm">
					<div class="flex justify-between gap-3">
						<dt class="text-muted">Version</dt>
						<dd class="tabular font-semibold">{latest.version}</dd>
					</div>
					<div class="flex justify-between gap-3">
						<dt class="text-muted">Calculée le</dt>
						<dd class="text-right">
							{formatDate(latest.computedAt)}{latest.computedBy ? `, par ${latest.computedBy}` : ''}
						</dd>
					</div>
					{#if latest.diagnostics}
						{@const diagnostics = latest.diagnostics}
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
							<dd class="tabular">{DECIMAL.format(diagnostics.maxDeviation * 100)} pt</dd>
						</div>
						<div class="flex justify-between gap-3">
							<dt class="text-muted">Poids extrêmes</dt>
							<dd class="tabular">
								{DECIMAL.format(diagnostics.minWeight)} à {DECIMAL.format(diagnostics.maxWeight)}
							</dd>
						</div>
						<div class="flex justify-between gap-3">
							<dt class="text-muted">Taille effective</dt>
							<dd class="tabular font-semibold">
								{formatCount(diagnostics.effectiveSampleSize)} / {formatCount(
									diagnostics.respondents
								)}
							</dd>
						</div>
						<p class="text-muted text-xs">
							La taille effective (Kish) est le nombre de répondants qu'il aurait fallu, sans
							redressement, pour la même précision.
						</p>

						{#if diagnostics.warnings.length > 0}
							<ul class="text-danger mt-1 flex flex-col gap-1 text-xs">
								{#each diagnostics.warnings as warning (`${warning.questionCode}:${warning.modalityKey}`)}
									<li>« {warning.questionCode} » / {warning.modalityKey} : {warning.reason}</li>
								{/each}
							</ul>
						{/if}
					{/if}
				</dl>

				{#if stale}
					<div class="border-warning/40 bg-cream rounded-field mt-4 border p-3 text-sm">
						<p>
							{formatCount(latest.unweighted)} réponse{latest.unweighted > 1 ? 's' : ''} arrivée{latest.unweighted >
							1
								? 's'
								: ''} depuis ce calcul, sans poids. La lecture redressée n'est plus proposée au public
							tant que le calcul n'est pas relancé.
						</p>
						{#if editable}
							<form method="POST" action="?/recompute" use:enhance class="mt-2">
								<button
									type="submit"
									class="bg-ink text-paper press rounded-pill inline-flex min-h-11 items-center px-4 py-2 text-sm font-semibold"
								>
									Relancer avec les mêmes marges
								</button>
							</form>
						{/if}
					</div>
				{/if}
			{/if}
		</Panel>

		{#if latest}
			<Panel title="Publication">
				<p class="text-sm">
					{#if latest.isPublished}
						Proposée au public depuis le {formatDate(latest.publishedAt)}, comme seconde lecture à
						côté des données brutes.
					{:else}
						Non publiée : le site public n'affiche que les données brutes.
					{/if}
				</p>

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
									disabled={stale}
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
									Confirmer
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
