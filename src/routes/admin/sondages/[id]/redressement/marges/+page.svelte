<script lang="ts">
	import { enhance } from '$app/forms';
	import Flash from '$components/admin/Flash.svelte';
	import Panel from '$components/admin/Panel.svelte';
	import { formatDecimal, formatPoints, formatShare } from '$lib/shared/format';
	import { can } from '$lib/shared/permissions';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const editable = $derived(can(data.user, 'survey.weight'));
	type Question = PageData['questions'][number];
	type Row = Question['rows'][number];

	/** La proposition de l Insee pour chaque question, si on vient de la demander. */
	const proposals = $derived(
		new Map((form?.census?.proposals ?? []).map((proposal) => [proposal.questionCode, proposal]))
	);

	/*
	 * Ce que l analyste a tape, par-dessus la valeur initiale (proposition de
	 * l Insee, sinon cible enregistree). Vide a chaque retour du serveur : la
	 * page repart alors de ce qui fait foi.
	 */
	let edits: Record<string, string> = $state({});
	let checks: Record<string, boolean> = $state({});
	let sourceEdit: string | null = $state(null);
	let loadingCensus = $state(false);

	function reset(): void {
		edits = {};
		checks = {};
		sourceEdit = null;
	}

	function initial(question: Question, row: Row): string {
		const proposal = proposals.get(question.code);
		if (proposal) {
			const value = proposal.values[row.key];
			return value === undefined ? '' : formatDecimal(value, 2);
		}
		return row.target === null ? '' : formatDecimal(row.target * 100, 2);
	}

	function valueOf(question: Question, row: Row): string {
		return edits[`${question.code}:${row.key}`] ?? initial(question, row);
	}

	function isSelected(question: Question): boolean {
		return checks[question.code] ?? (question.selected || proposals.has(question.code));
	}

	/** « 12,5 », « 12.5 » ou « 12,5 % ». Vide vaut zero, illisible vaut NaN. */
	function parsePercent(raw: string): number {
		const cleaned = raw.replace('%', '').replace(',', '.').trim();
		return cleaned === '' ? 0 : Number(cleaned);
	}

	/** Le total d une variable, recalcule a chaque frappe. */
	function totalOf(question: Question): { value: number; readable: boolean; ok: boolean } {
		let value = 0;
		let readable = true;
		for (const row of question.rows) {
			const parsed = parsePercent(valueOf(question, row));
			if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) readable = false;
			else value += parsed;
		}
		return { value, readable, ok: readable && Math.abs(value - 100) <= 0.005 };
	}

	const selectedQuestions = $derived(data.questions.filter((question) => isSelected(question)));
	const blocked = $derived(
		selectedQuestions.length === 0 || selectedQuestions.some((question) => !totalOf(question).ok)
	);

	const sourceValue = $derived(sourceEdit ?? form?.census?.source ?? data.source);

	function originOf(question: Question): string {
		return proposals.get(question.code)?.origin ?? question.originJson;
	}

	/** D ou vient la marge affichee, en une ligne. */
	function provenance(question: Question): string {
		if (proposals.has(question.code)) {
			return `Proposition du recensement ${form?.census?.period ?? ''}, à relire`;
		}
		if (question.origin) {
			return `Insee, RP ${question.origin.period}${question.origin.edited ? ', retouchée à la main' : ''}`;
		}
		return question.selected ? 'Saisie à la main' : '';
	}
</script>

<Flash message={form?.message} />

<div class="flex flex-col gap-6">
	<Panel
		title="Référentiel de l'Insee"
		description="Le recensement de la population donne les parts de la France métropolitaine, 18 ans ou plus, lues en direct dans l'API Melodi de l'Insee (tableaux POP1 et POP6). Les parts proposées remplissent le formulaire ci-dessous : rien n'est enregistré avant votre relecture."
	>
		{#if editable}
			<form
				method="POST"
				action="?/census"
				use:enhance={() => {
					loadingCensus = true;
					return async ({ update }) => {
						await update({ reset: false });
						reset();
						loadingCensus = false;
					};
				}}
				class="flex flex-wrap items-center gap-3"
			>
				<button
					type="submit"
					disabled={loadingCensus}
					class="bg-ink text-paper press rounded-pill inline-flex min-h-11 items-center px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
				>
					{loadingCensus ? "Interrogation de l'Insee…" : 'Proposer les marges du recensement'}
				</button>
				<p class="text-muted text-xs" aria-live="polite">
					{#if loadingCensus}
						Trois tableaux à lire, quelques secondes au plus.
					{:else}
						Sexe, âge (à partir de vos tranches), PCS, région ou Île-de-France et province.
					{/if}
				</p>
			</form>
		{:else}
			<p class="text-muted text-sm">
				Il faut le droit « Redresser un sondage » pour interroger l'Insee et enregistrer des marges.
			</p>
		{/if}
	</Panel>

	<form
		method="POST"
		action="?/save"
		use:enhance={() =>
			async ({ update }) => {
				await update({ reset: false });
				reset();
			}}
		class="flex flex-col gap-6"
	>
		<Panel
			title="Marges cibles"
			description="Cochez les variables de calage et donnez la part de chaque modalité dans la population visée, en pourcentage. Pour un public cible précis (des bénévoles de 18 à 30 ans, les habitants d'un territoire), saisissez vos propres parts et nommez-en la source plus bas."
		>
			{#if data.questions.length === 0}
				<p class="text-sm">
					Aucune question de cette enquête ne peut porter un calage : il faut une question à choix
					unique, croisable, avec des modalités déclarées.
				</p>
			{:else}
				<div class="flex flex-col gap-5">
					{#each data.questions as question (question.code)}
						{@const selected = isSelected(question)}
						{@const total = totalOf(question)}
						{@const proposal = proposals.get(question.code)}
						<fieldset class="border-ink/20 rounded-field border p-4">
							<legend class="sr-only">{question.label}</legend>
							<div class="flex flex-wrap items-center justify-between gap-2">
								<label class="flex min-h-11 items-center gap-3">
									<input
										type="checkbox"
										name="variable"
										value={question.code}
										checked={selected}
										onchange={(event) => (checks[question.code] = event.currentTarget.checked)}
										disabled={!editable}
										class="size-5"
									/>
									<span class="font-medium">{question.label}</span>
								</label>
								<span class="text-muted text-xs">
									{question.dimension ? `Recensement : ${question.dimension}` : 'Sans équivalent Insee'}
									{#if provenance(question)}· {provenance(question)}{/if}
								</span>
							</div>

							{#if selected && originOf(question)}
								<input type="hidden" name="origine:{question.code}" value={originOf(question)} />
							{/if}

							<div class="mt-3 overflow-x-auto">
								<table class="w-full min-w-xl text-sm">
									<caption class="sr-only">Marges de « {question.label} »</caption>
									<thead class="text-muted text-left text-xs">
										<tr>
											<th scope="col" class="py-1.5 pr-3 font-semibold">Modalité</th>
											<th scope="col" class="px-3 py-1.5 text-right font-semibold">Échantillon</th>
											{#if proposal}
												<th scope="col" class="px-3 py-1.5 font-semibold">Recensement</th>
											{/if}
											<th scope="col" class="px-3 py-1.5 text-right font-semibold">Cible</th>
											<th scope="col" class="px-3 py-1.5 text-right font-semibold">Redressé</th>
											<th scope="col" class="py-1.5 pl-3 text-right font-semibold">Écart</th>
										</tr>
									</thead>
									<tbody>
										{#each question.rows as row (row.key)}
											{@const census = proposal?.modalities.find((modality) => modality.key === row.key)}
											<tr class="border-ink/10 border-t">
												<th scope="row" class="py-1.5 pr-3 text-left font-normal">{row.label}</th>
												<td class="tabular px-3 py-1.5 text-right">{formatShare(row.observed)}</td>
												{#if proposal}
													<td class="px-3 py-1.5 text-xs">
														{#if census?.census && !census.reason}
															{census.census}
														{:else if census?.reason}
															<span class="text-danger">{census.reason}</span>
														{/if}
													</td>
												{/if}
												<td class="px-3 py-1.5 text-right">
													{#if selected}
														<label class="inline-flex items-center gap-1">
															<span class="sr-only">Cible pour « {row.label} », en pourcentage</span>
															<input
																name="cible:{question.code}:{row.key}"
																inputmode="decimal"
																autocomplete="off"
																value={valueOf(question, row)}
																oninput={(event) =>
																	(edits[`${question.code}:${row.key}`] = event.currentTarget.value)}
																disabled={!editable}
																class="border-ink/20 bg-paper rounded-field tabular min-h-11 w-24 border px-2 py-1 text-right"
															/>
															<span class="text-muted">%</span>
														</label>
													{:else}
														<span class="text-muted">non retenue</span>
													{/if}
												</td>
												<td class="tabular px-3 py-1.5 text-right">
													{row.weighted === null ? '' : formatShare(row.weighted)}
												</td>
												<td class="tabular py-1.5 pl-3 text-right">
													{row.weighted === null || row.target === null
														? ''
														: formatPoints(row.weighted - row.target)}
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>

							{#if selected}
								<!-- Le total se lit en toutes lettres, pas seulement a sa couleur. -->
								<p
									class="mt-2 text-sm font-semibold {total.ok ? '' : 'text-danger'}"
									aria-live="polite"
								>
									{#if !total.readable}
										Une valeur n'est pas un pourcentage entre 0 et 100.
									{:else if total.ok}
										Total : 100 %. Conforme.
									{:else}
										{@const gap = formatDecimal(Math.abs(100 - total.value), 2)}
										Total : {formatDecimal(total.value, 2)} %.
										{total.value > 100 ? `${gap} pt de trop` : `Il manque ${gap} pt`} pour faire exactement
										100 %.
									{/if}
								</p>
							{/if}

							{#if proposal && proposal.notes.length > 0}
								<ul class="text-muted mt-2 flex list-disc flex-col gap-1 pl-5 text-xs">
									{#each proposal.notes as note (note)}<li>{note}</li>{/each}
								</ul>
							{/if}

							{#if question.unknown > 0}
								<p class="text-muted mt-2 text-xs">
									{question.unknown} répondant{question.unknown > 1 ? 's' : ''} sans réponse à cette question.
									Le calcul les garde, avec un poids neutre sur cette variable.
								</p>
							{/if}
						</fieldset>
					{/each}
				</div>
			{/if}
		</Panel>

		<Panel
			title="Source des marges"
			description="Publiée avec les chiffres redressés. Un redressement dont on ne dit pas d'où viennent les marges ne vaut pas mieux qu'un redressement caché."
		>
			<label class="flex flex-col gap-1.5">
				<span class="text-sm font-semibold">Source</span>
				<textarea
					name="source"
					rows="3"
					value={sourceValue}
					oninput={(event) => (sourceEdit = event.currentTarget.value)}
					placeholder="Insee, recensement de la population, France métropolitaine, 18 ans ou plus"
					disabled={!editable}
					class="border-ink/20 bg-paper rounded-field border px-3 py-2"
				></textarea>
			</label>

			{#snippet footer()}
				{#if editable}
					<div class="flex flex-wrap items-center gap-3">
						<button
							type="submit"
							disabled={blocked}
							class="bg-ink text-paper press rounded-pill inline-flex min-h-11 items-center px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
						>
							Enregistrer les marges
						</button>
						{#if blocked}
							<p class="text-muted text-xs">
								{selectedQuestions.length === 0
									? 'Retenez au moins une variable.'
									: 'Chaque variable retenue doit totaliser exactement 100 %.'}
							</p>
						{/if}
					</div>
				{/if}
			{/snippet}
		</Panel>
	</form>
</div>
