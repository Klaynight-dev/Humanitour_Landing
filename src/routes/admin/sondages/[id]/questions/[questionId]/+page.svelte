<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '$components/admin/PageHeader.svelte';
	import Panel from '$components/admin/Panel.svelte';
	import { formatCount } from '$lib/shared/format';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head><title>{data.question.label} — Back-office</title></svelte:head>

<PageHeader
	title={data.question.label}
	breadcrumb={[
		{ label: 'Sondages', href: '/admin/sondages' },
		{ label: 'Enquete', href: `/admin/sondages/${data.surveyId}` }
	]}
	description="{data.type.label} — {data.type.description}"
/>

{#if form?.message}
	<p role="status" class="brut bg-paper rounded-card mb-5 px-4 py-3 text-sm">
		{form.message}
	</p>
{/if}

<div class="grid gap-6 lg:grid-cols-[1fr_20rem]">
	<div class="flex flex-col gap-6">
		<Panel title="La question">
			<form method="POST" action="?/save" use:enhance class="flex flex-col gap-4">
				<label class="flex flex-col gap-1.5">
					<span class="text-sm font-semibold">Libelle</span>
					<span class="text-muted text-xs">
						Le libelle exact pose sur le terrain. Il est affiche avec chaque graphique, parce que
						la formulation fait partie du resultat.
					</span>
					<textarea
						name="label"
						rows="2"
						required
						class="border-ink bg-paper rounded-lg border-2 px-3 py-2">{data.question.label}</textarea
					>
				</label>

				<label class="flex flex-col gap-1.5">
					<span class="text-sm font-semibold">Aide a la passation</span>
					<textarea name="help" rows="2" class="border-ink bg-paper rounded-lg border-2 px-3 py-2"
						>{data.question.help ?? ''}</textarea
					>
				</label>

				<label class="flex flex-col gap-1.5">
					<span class="text-sm font-semibold">Configuration (JSON)</span>
					<span class="text-muted text-xs">
						Bornes d'une echelle, unite et tranches d'un nombre. Validee par le type de question :
						une configuration refusee n'est pas enregistree.
					</span>
					<textarea
						name="config"
						rows="6"
						spellcheck="false"
						class="border-ink bg-paper rounded-lg border-2 px-3 py-2 font-mono text-xs"
						>{data.question.config}</textarea
					>
				</label>

				<label class="flex items-start gap-2.5">
					<input
						type="checkbox"
						name="isCrossable"
						checked={data.question.isCrossable}
						disabled={!data.type.crossable}
						class="accent-coral-500 mt-1 h-4 w-4"
					/>
					<span class="text-sm">
						<span class="font-semibold">Proposer au croisement</span>
						<span class="text-muted block text-xs">
							{#if data.type.crossable}
								Decochez pour retirer cette question de l'explorateur public.
							{:else}
								Ce type n'est jamais croisable : trop de modalites, et risque de
								reidentification.
							{/if}
						</span>
					</span>
				</label>

				<div>
					<button
						type="submit"
						class="bg-ink text-white brut brut-press rounded-pill px-5 py-2.5 text-sm font-bold"
					>
						Enregistrer
					</button>
				</div>
			</form>
		</Panel>

		{#if data.type.usesOptions}
			<Panel
				title="Modalites"
				description="Les modalites marquees « sans reponse » sont comptees comme les autres, mais affichees en retrait et en gris."
			>
				{#if data.options.length === 0}
					<p class="text-muted text-sm">
						Aucune modalite. Une question a choix sans modalite rejettera tout import.
					</p>
				{:else}
					<ul class="flex flex-col gap-2">
						{#each data.options as option (option.id)}
							<li class="border-ink rounded-lg border-2 p-3">
								<form
									method="POST"
									action="?/updateOption"
									use:enhance
									class="flex flex-wrap items-end gap-2"
								>
									<input type="hidden" name="optionId" value={option.id} />

									<label class="flex min-w-48 flex-1 flex-col gap-1">
										<span class="text-xs font-semibold">Libelle</span>
										<input
											name="label"
											value={option.label}
											class="border-ink bg-paper rounded-lg border-2 px-2.5 py-1.5 text-sm"
										/>
									</label>

									<label class="flex flex-col gap-1">
										<span class="text-xs font-semibold">Couleur</span>
										<input
											type="color"
											name="color"
											value={option.color ?? '#FF5757'}
											class="border-ink h-9 w-14 rounded-lg border-2 px-1"
										/>
									</label>

									<label class="flex items-center gap-2 pb-2 text-xs">
										<input
											type="checkbox"
											name="isNonResponse"
											checked={option.isNonResponse}
											class="accent-coral-500 h-4 w-4"
										/>
										Sans reponse
									</label>

									<button
										type="submit"
										class="border-ink brut-sm brut-press bg-paper rounded-pill border-2 px-3 py-1.5 text-xs font-medium"
									>
										Enregistrer
									</button>
								</form>

								<div class="mt-2 flex items-center justify-between gap-3">
									<code class="text-muted bg-surface rounded px-1.5 py-0.5 text-xs">
										{option.code}
									</code>
									<form method="POST" action="?/deleteOption" use:enhance>
										<input type="hidden" name="optionId" value={option.id} />
										<button
											type="submit"
											class="border-ink text-danger bg-paper rounded-pill border-2 px-2.5 py-1 text-xs"
										>
											Supprimer
										</button>
									</form>
								</div>
							</li>
						{/each}
					</ul>
				{/if}

				{#snippet footer()}
					<form method="POST" action="?/addOption" use:enhance class="flex flex-wrap items-end gap-2">
						<label class="flex min-w-56 flex-1 flex-col gap-1">
							<span class="text-xs font-semibold">Nouvelle modalite</span>
							<input
								name="label"
								required
								placeholder="Le pouvoir d'achat"
								class="border-ink bg-paper rounded-lg border-2 px-3 py-2 text-sm"
							/>
						</label>
						<label class="flex items-center gap-2 pb-2 text-xs">
							<input type="checkbox" name="isNonResponse" class="accent-coral-500 h-4 w-4" />
							Sans reponse
						</label>
						<button
							type="submit"
							class="bg-ink text-white brut-sm brut-press rounded-pill px-4 py-2 text-sm font-bold"
						>
							Ajouter
						</button>
					</form>
				{/snippet}
			</Panel>
		{/if}
	</div>

	<aside>
		<Panel title="Reperes">
			<dl class="flex flex-col gap-3 text-sm">
				<div class="flex justify-between gap-3">
					<dt class="text-muted">Code</dt>
					<dd><code class="bg-surface rounded px-1.5 py-0.5 text-xs">{data.question.code}</code></dd>
				</div>
				<div class="flex justify-between gap-3">
					<dt class="text-muted">Type</dt>
					<dd class="font-semibold">{data.type.label}</dd>
				</div>
				<div class="flex justify-between gap-3">
					<dt class="text-muted">Reponses</dt>
					<dd class="tabular font-semibold">{formatCount(data.question.answerCount)}</dd>
				</div>
			</dl>

			<p class="text-muted mt-4 text-xs">
				Le code entre dans les permaliens de croisement partages a l'exterieur. Il ne peut donc
				plus etre modifie apres creation.
			</p>
		</Panel>
	</aside>
</div>
