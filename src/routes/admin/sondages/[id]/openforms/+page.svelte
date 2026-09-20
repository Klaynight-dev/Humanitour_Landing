<script lang="ts">
	import EmptyState from '$components/admin/EmptyState.svelte';
	import Flash from '$components/admin/Flash.svelte';
	import PageHeader from '$components/admin/PageHeader.svelte';
	import Panel from '$components/admin/Panel.svelte';
	import StatusBadge from '$components/admin/StatusBadge.svelte';
	import Table from '$components/admin/Table.svelte';
	import TrendChart from '$components/admin/TrendChart.svelte';
	import { formatCount, formatDate } from '$lib/shared/format';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	/**
	 * L'ecart entre ce qu'Openforms a collecte et ce qui est publie ici.
	 *
	 * C'est le chiffre qui compte sur cet ecran : un ecart qui ne se resorbe pas
	 * signale une synchronisation en panne, la ou deux compteurs cote a cote
	 * laisseraient le lecteur faire la soustraction — ou ne pas la faire.
	 */
	const pending = $derived(
		data.live?.summary ? data.live.summary.totalResponses - data.survey.mirrored : null
	);

	/**
	 * Champs proposables, lus avec la cle de lecture.
	 *
	 * Pas ceux du rapport d'utilisabilite : celui-ci decrit ce que `humanitour.fr`
	 * sait AFFICHER, et il disparait des que le formulaire est depublie. La
	 * correspondance, elle, porte sur ce que la synchronisation sait LIRE, et
	 * doit rester etablissable collecte fermee.
	 */
	const collectable = $derived(data.live?.fields ?? []);

	const mapped = $derived(data.questions.filter((question) => question.openformsKey).length);

	/** Intitules des declencheurs. Le journal dit « par quoi », pas « MANUAL ». */
	const TRIGGERS: Record<string, string> = {
		MANUAL: 'à la main',
		SCHEDULED: 'minuterie',
		WEBHOOK: 'webhook',
		SUBMISSION: 'réponse sur le site'
	};
</script>

<svelte:head><title>Collecte Openforms — {data.survey.title}</title></svelte:head>

<PageHeader
	title="Collecte Openforms"
	breadcrumb={[
		{ label: 'Sondages', href: '/admin/sondages' },
		{ label: data.survey.title, href: `/admin/sondages/${data.survey.id}` }
	]}
	description="Openforms est le seul canal de collecte. Ce site en publie le miroir."
/>

<Flash message={form?.message} />

{#if !data.configured}
	<EmptyState
		title="Openforms n’est pas configuré"
		description="Renseignez OPENFORMS_URL et OPENFORMS_API_KEY dans l’environnement du serveur, puis rechargez cette page. La clé doit appartenir à un compte qui ne voit que les formulaires de l’enquête."
	/>
{:else if !data.survey.formId}
	<!-- ÉTAPE 1 : relier -->
	<Panel
		title="Relier un formulaire"
		description="Tant qu’aucun formulaire n’est relié, cette enquête n’a aucun moyen de recevoir des réponses."
	>
		{#if data.forms.length === 0}
			<p class="text-muted text-sm">
				Aucun formulaire disponible. Soit la clé d’API n’en voit aucun, soit ils sont déjà reliés à
				d’autres enquêtes.
			</p>
		{:else}
			<form method="POST" action="?/link" class="flex flex-col gap-4">
				<label class="flex flex-col gap-1.5">
					<span class="text-sm font-semibold">Formulaire</span>
					<select
						name="formId"
						required
						class="border-ink/20 bg-paper rounded-field min-h-11 border px-3 py-2"
					>
						<option value="">Choisir…</option>
						{#each data.forms as remote (remote.id)}
							<option value={remote.id}>
								{remote.title} — {formatCount(remote.responseCount)} réponse(s){remote.isPublished
									? ''
									: ' (fermé)'}
							</option>
						{/each}
					</select>
				</label>
				<div>
					<button
						type="submit"
						class="bg-ink text-paper press rounded-pill inline-flex min-h-11 items-center px-4 py-2 text-sm font-semibold"
					>
						Relier et proposer la correspondance
					</button>
				</div>
			</form>
		{/if}
	</Panel>
{:else}
	<!-- ÉTAPE 2 : l'état de la collecte, lu chez Openforms -->
	<div class="mt-6 grid gap-5 lg:grid-cols-3">
		<Panel title="État du formulaire">
			<div class="flex flex-col gap-2">
				<StatusBadge status={data.survey.open ? 'PUBLISHED' : 'ARCHIVED'} />
				<p class="text-muted text-sm">
					{data.survey.open ? 'Ouvert aux réponses.' : 'Fermé : aucune réponse ne peut entrer.'}
				</p>
				{#if data.survey.opensAt}
					<p class="text-muted text-sm">Ouvre le {formatDate(data.survey.opensAt)}</p>
				{/if}
				{#if data.survey.closesAt}
					<p class="text-muted text-sm">Ferme le {formatDate(data.survey.closesAt)}</p>
				{/if}
				{#if data.survey.maxResponses}
					<p class="text-muted text-sm">
						Quota : {formatCount(data.survey.maxResponses)} réponses
					</p>
				{/if}
			</div>
		</Panel>

		<Panel title="Chez Openforms">
			{#if data.live?.summary}
				<p class="tabular text-3xl font-semibold">
					{formatCount(data.live.summary.totalResponses)}
				</p>
				<p class="text-muted mt-1 text-sm">soumissions enregistrées, lues à l’instant</p>
			{:else}
				<p class="text-muted text-sm">{data.live?.countersFailure ?? 'Chiffres indisponibles.'}</p>
			{/if}
		</Panel>

		<Panel title="Publié ici">
			<p class="tabular text-3xl font-semibold">{formatCount(data.survey.mirrored)}</p>
			{#if pending === null}
				<p class="text-muted mt-1 text-sm">
					Dernière synchronisation :
					{data.survey.syncedAt ? formatDate(data.survey.syncedAt) : 'jamais'}
				</p>
			{:else if pending > 0}
				<p class="mt-1 text-sm font-semibold">
					{formatCount(pending)} réponse(s) pas encore reprise(s)
				</p>
			{:else}
				<p class="text-muted mt-1 text-sm">À jour avec Openforms.</p>
			{/if}
		</Panel>
	</div>

	{#if data.live?.summary && data.live.summary.activity.length > 0}
		<div class="mt-6">
			<Panel title="Activité" description="Soumissions par jour, trente derniers jours, chez Openforms.">
				<TrendChart
					points={data.live.summary.activity.map((point) => ({
						key: point.date,
						label: point.date,
						count: point.count,
						// Les chiffres d'Openforms ne passent pas par le seuil de
						// k-anonymat : ils ne sont vus que par le back-office, et masquer
						// un compteur de collecte a l'operateur qui pilote la collecte
						// n'anonymiserait personne.
						suppressed: false
					}))}
					caption="Soumissions par jour"
				/>
			</Panel>
		</div>
	{/if}

	<!-- Ce que le questionnaire distant rend impossible ou amoindri ici -->
	{#if data.live?.usability && !data.live.usability.servable}
		<div class="mt-6">
			<Panel
				title="Ce questionnaire ne peut pas être rempli sur humanitour.fr"
				description="La page publique renverra vers forms.humanitour.fr, qui sait le servir."
			>
				<ul class="flex flex-col gap-2">
					{#each data.live.usability.blockers as blocker (blocker.key)}
						<li class="text-sm">
							<span class="font-semibold">{blocker.label}</span>
							<span class="text-muted"> — {blocker.reason}</span>
						</li>
					{/each}
				</ul>
			</Panel>
		</div>
	{:else if data.live?.usability && data.live.usability.removed.length > 0}
		<div class="mt-6">
			<Panel
				title="Champs non proposés ici"
				description="Ils restent posés sur forms.humanitour.fr, mais ne sont ni affichés ni envoyés depuis ce site."
			>
				<ul class="flex flex-col gap-2">
					{#each data.live.usability.removed as removed (removed.key)}
						<li class="text-sm">
							<span class="font-semibold">{removed.label}</span>
							<span class="text-muted"> — {removed.reason}</span>
						</li>
					{/each}
				</ul>
			</Panel>
		</div>
	{/if}

	<!-- ÉTAPE 3 : la correspondance -->
	<div class="mt-6">
		<Panel
			title="Correspondance des champs"
			description="Quelle question de l’enquête reçoit quel champ du formulaire. Une question sans champ n’est jamais alimentée."
		>
			{#if data.questions.length === 0}
				<p class="text-muted text-sm">
					Cette enquête n’a aucune question. Ajoutez-en depuis la fiche du sondage avant
					d’établir la correspondance.
				</p>
			{:else}
				<form method="POST" action="?/map" class="flex flex-col gap-4">
					<!--
						L'etat de la correspondance se lit avant de synchroniser : une
						passe lancee sans aucune question reliee echoue, et le motif
						n'apparaissait qu'apres coup, dans le journal.
					-->
					{#if mapped === 0}
						<p class="text-warning text-sm">
							Aucune question n’est reliée à un champ. La synchronisation refusera de s’exécuter
							tant que la correspondance n’est pas établie.
						</p>
					{:else}
						<p class="text-muted text-sm">
							{formatCount(mapped)} question(s) reliée(s) sur {formatCount(data.questions.length)}.
							Une question sans champ n’est jamais alimentée.
						</p>
					{/if}

					{#if data.live && collectable.length === 0}
						<p class="text-warning text-sm">
							{data.live.fieldsFailure ??
								'Ce formulaire ne porte aucun champ que la synchronisation saurait reprendre.'}
						</p>
					{/if}

					<div class="flex flex-col gap-3">
						{#each data.questions as question (question.id)}
							<label class="grid gap-2 sm:grid-cols-[1fr_1fr] sm:items-center">
								<span class="text-sm">
									<span class="font-semibold">{question.label}</span>
									<span class="text-muted block text-xs">{question.code} · {question.type}</span>
								</span>
								<select
									name="map:{question.code}"
									class="border-ink/20 bg-paper rounded-field min-h-11 border px-3 py-2"
								>
									<option value="">Aucun champ</option>
									{#each collectable as field (field.key)}
										<option value={field.key} selected={question.openformsKey === field.key}>
											{field.label} · {field.type} ({field.key})
										</option>
									{/each}
									<!--
										La cle enregistree peut ne plus figurer dans le questionnaire
										distant : le proposer quand meme evite de l'effacer en silence
										au premier enregistrement.
									-->
									{#if question.openformsKey && !collectable.some((f) => f.key === question.openformsKey)}
										<option value={question.openformsKey} selected>
											{question.openformsKey} — absent du formulaire actuel
										</option>
									{/if}
								</select>
							</label>
						{/each}
					</div>
					<div class="flex flex-wrap items-center gap-3">
						<button
							type="submit"
							class="bg-ink text-paper press rounded-pill inline-flex min-h-11 items-center px-4 py-2 text-sm font-semibold"
						>
							Enregistrer la correspondance
						</button>
						<!--
							`formaction` plutot qu'un second formulaire : deux formulaires
							imbriques sont invalides, et un formulaire voisin obligerait a
							sortir le bouton du bloc auquel il se rapporte.
						-->
						<button
							type="submit"
							formaction="?/suggest"
							class="border-ink/25 press bg-paper rounded-pill inline-flex min-h-11 items-center border px-4 py-2 text-sm font-medium"
						>
							Proposer une correspondance
						</button>
						<span class="text-muted text-xs">
							La proposition compare les libellés et ne touche pas aux champs déjà associés.
						</span>
					</div>
				</form>
			{/if}
		</Panel>
	</div>

	<!-- ÉTAPE 4 : synchroniser -->
	<div class="mt-6 flex flex-wrap gap-3">
		<form method="POST" action="?/sync">
			<button
				type="submit"
				class="bg-ink text-paper press rounded-pill inline-flex min-h-11 items-center px-4 py-2 text-sm font-semibold"
			>
				Synchroniser maintenant
			</button>
		</form>
		<form method="POST" action="?/unlink">
			<button
				type="submit"
				class="border-ink/25 press bg-paper rounded-pill inline-flex min-h-11 items-center border px-4 py-2 text-sm font-medium"
			>
				Détacher le formulaire
			</button>
		</form>
	</div>

	<div class="mt-6">
		<Table
			empty={data.syncs.length === 0}
			emptyTitle="Aucune synchronisation"
			emptyDescription="Lancez une première passe pour reprendre les réponses déjà collectées."
		>
			{#snippet head()}
				<tr>
					<th class="px-5 py-3 text-left">Quand</th>
					<th class="px-3 py-3 text-left">Déclenchée</th>
					<th class="px-3 py-3 text-left">Issue</th>
					<th class="px-3 py-3 text-right">Lues</th>
					<th class="px-3 py-3 text-right">Reprises</th>
					<th class="px-5 py-3 text-right">Refusées</th>
				</tr>
			{/snippet}

			{#snippet body()}
				{#each data.syncs as pass (pass.id)}
				<tr class="border-ink/12 border-t align-top">
					<td class="px-5 py-3 text-sm">{formatDate(pass.startedAt)}</td>
					<td class="px-3 py-3 text-sm">
						{TRIGGERS[pass.trigger] ?? pass.trigger}
						{#if pass.author}<span class="text-muted block text-xs">{pass.author}</span>{/if}
					</td>
					<td class="px-3 py-3">
						<StatusBadge status={pass.status} />
						{#if pass.message}
							<p class="text-muted mt-1 max-w-md text-xs">{pass.message}</p>
						{/if}
					</td>
					<td class="tabular px-3 py-3 text-right text-sm">{formatCount(pass.fetched)}</td>
					<td class="tabular px-3 py-3 text-right text-sm">{formatCount(pass.created)}</td>
					<td class="tabular px-5 py-3 text-right text-sm">
						{formatCount(pass.rejected)}
						{#if pass.errors.length > 0}
							<!--
								Les rejets sont replies mais presents : une synchronisation ne
								masque jamais un refus, elle evite seulement d'en noyer la liste.
							-->
							<details class="mt-2 text-left">
								<summary class="cursor-pointer text-xs font-semibold">Voir les motifs</summary>
								<ul class="mt-2 flex flex-col gap-1">
									{#each pass.errors as rejection (rejection.submission + rejection.field)}
										<li class="text-muted text-xs">
											<span class="font-semibold">{rejection.field}</span>
											= « {rejection.value} » — {rejection.reason}
										</li>
									{/each}
								</ul>
							</details>
						{/if}
						</td>
					</tr>
				{/each}
			{/snippet}
		</Table>
	</div>
{/if}
