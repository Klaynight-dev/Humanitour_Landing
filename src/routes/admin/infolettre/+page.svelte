<script lang="ts">
	import { enhance } from '$app/forms';
	import FilterBar from '$components/admin/FilterBar.svelte';
	import Flash from '$components/admin/Flash.svelte';
	import PageHeader from '$components/admin/PageHeader.svelte';
	import Panel from '$components/admin/Panel.svelte';
	import StatTile from '$components/admin/StatTile.svelte';
	import Table from '$components/admin/Table.svelte';
	import { formatCount, formatDate } from '$lib/shared/format';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	/** Confirmation par ligne : personne ne se fait desabonner au premier clic. */
	let confirming: string | null = $state(null);

	const previous = $derived(data.page > 1 ? data.page - 1 : null);
	const next = $derived(data.page < data.pages ? data.page + 1 : null);

	/**
	 * L'adresse d'une page de la liste, recherche conservee.
	 *
	 * Construite a la main plutot qu'avec `URLSearchParams` : la regle
	 * `svelte/prefer-svelte-reactivity` interdit la classe native dans un
	 * composant, et deux parametres ne valent pas d'en importer une reactive.
	 */
	function pageHref(target: number): string {
		const parts: string[] = [];
		if (data.search !== '') parts.push(`q=${encodeURIComponent(data.search)}`);
		if (target > 1) parts.push(`page=${target}`);
		return parts.length === 0 ? '?' : `?${parts.join('&')}`;
	}
</script>

<svelte:head><title>Infolettre — Back-office</title></svelte:head>

<PageHeader
	title="Infolettre"
	description="Les personnes qui ont demandé à recevoir des nouvelles. C'est la seule liste nominative du site."
>
	{#snippet actions()}
		{#if data.manageable}
			<a
				href="/admin/infolettre/abonnes.csv"
				class="border-ink/25 press bg-paper rounded-pill inline-flex min-h-11 items-center justify-center border px-4 py-2 text-sm font-medium"
			>
				Exporter en CSV
			</a>
		{/if}
	{/snippet}
</PageHeader>

<Flash message={form?.message} />

<div class="mb-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
	<StatTile label="Abonnés" total={data.total} current={data.lastThirty} />

	<Panel title="Envoi">
		<p class="text-sm">
			Aucun expéditeur n'est branché sur ce site : rien ne part d'ici pour l'instant.
		</p>
		<p class="text-muted mt-2 text-sm">
			Tant que c'est le cas, la confirmation par courriel n'existe pas non plus, et la
			désinscription se fait en saisissant son adresse sur le site, sans lien signé.
		</p>
	</Panel>

	<Panel title="Ce que la base retient">
		<p class="text-sm">L'adresse, la date, et l'empreinte tronquée de l'adresse IP quand elle existe.</p>
		<p class="text-muted mt-2 text-sm">
			L'empreinte prouve le consentement et ne sort jamais de la base : ni à l'écran, ni à
			l'export. Aucune relation ne relie un abonné à une réponse de sondage — une adresse importée
			ou reçue via un sondage ne porte pas d'empreinte, faute d'IP à prouver.
		</p>
	</Panel>
</div>

{#if data.manageable}
	<div class="mb-6">
		<Panel
			title="Importer des adresses"
			description="Collez une colonne copiée depuis un tableur, ou une liste tapée à la main : une adresse par ligne, ou séparées par une virgule."
		>
			<form method="POST" action="?/import" use:enhance class="flex flex-col gap-3">
				<label class="flex flex-col gap-1.5">
					<span class="sr-only">Adresses à importer</span>
					<textarea
						name="emails"
						rows="4"
						required
						placeholder="alice@exemple.fr, bob@exemple.fr…"
						class="border-ink/20 bg-paper rounded-field min-h-11 border px-3 py-2 text-sm"
					></textarea>
				</label>
				<div>
					<button
						type="submit"
						class="bg-ink text-paper press rounded-pill inline-flex min-h-11 items-center px-4 py-2 text-sm font-semibold"
					>
						Importer ces adresses
					</button>
				</div>
			</form>
		</Panel>
	</div>
{/if}

<FilterBar active={data.search !== ''}>
	<label class="flex flex-col gap-1.5">
		<span class="text-sm font-semibold">Chercher une adresse</span>
		<input
			type="search"
			name="q"
			value={data.search}
			placeholder="exemple@courriel.fr"
			class="border-ink/20 bg-paper rounded-field min-h-11 w-64 border px-3 py-2 text-sm"
		/>
	</label>
</FilterBar>

{#if data.search !== ''}
	<p class="text-muted mb-3 text-sm" role="status">
		{formatCount(data.matching)} adresse{data.matching > 1 ? 's' : ''} contenant « {data.search} », sur
		{formatCount(data.total)}.
	</p>
{/if}

<Table
	empty={data.subscribers.length === 0}
	emptyTitle={data.search === '' ? 'Personne pour le moment' : 'Aucune adresse ne correspond'}
	emptyDescription={data.search === ''
		? "Le formulaire d'inscription vit sur la page d'accueil et sur /infolettre. Les inscriptions apparaîtront ici."
		: 'Essayez une autre recherche, ou affichez toute la liste.'}
	minWidth="34rem"
>
	{#snippet head()}
		<th scope="col" class="px-4 py-3 font-semibold">Adresse</th>
		<th scope="col" class="px-4 py-3 font-semibold">Inscription</th>
		{#if data.manageable}
			<th scope="col" class="px-4 py-3 text-right font-semibold">Action</th>
		{/if}
	{/snippet}

	{#snippet body()}
		{#each data.subscribers as subscriber (subscriber.id)}
			<tr class="border-ink/10 border-b last:border-0">
				<td class="px-4 py-3">{subscriber.email}</td>
				<td class="text-muted px-4 py-3">{formatDate(subscriber.createdAt)}</td>
				{#if data.manageable}
					<td class="px-4 py-3 text-right">
						{#if confirming === subscriber.id}
							<form
								method="POST"
								action="?/unsubscribe"
								use:enhance={() => {
									confirming = null;
									return async ({ update }) => update();
								}}
								class="inline-flex flex-wrap justify-end gap-2"
							>
								<input type="hidden" name="email" value={subscriber.email} />
								<button
									type="submit"
									class="bg-danger text-paper press rounded-pill inline-flex min-h-11 items-center px-4 py-2 text-sm font-semibold"
								>
									Confirmer
								</button>
								<button
									type="button"
									onclick={() => (confirming = null)}
									class="border-ink/25 bg-paper press rounded-pill inline-flex min-h-11 items-center border px-4 py-2 text-sm"
								>
									Annuler
								</button>
							</form>
						{:else}
							<button
								type="button"
								onclick={() => (confirming = subscriber.id)}
								class="border-ink/25 text-danger bg-paper press rounded-pill inline-flex min-h-11 items-center border px-4 py-2 text-sm"
							>
								Désabonner
							</button>
						{/if}
					</td>
				{/if}
			</tr>
		{/each}
	{/snippet}
</Table>

{#if data.pages > 1}
	<nav class="mt-5 flex items-center justify-between gap-3" aria-label="Pages de la liste">
		{#if previous}
			<a
				href={pageHref(previous)}
				class="border-ink/25 bg-paper press rounded-pill inline-flex min-h-11 items-center border px-4 py-2 text-sm font-medium"
			>
				Page précédente
			</a>
		{:else}
			<span></span>
		{/if}

		<p class="text-muted text-sm">Page {data.page} sur {data.pages}</p>

		{#if next}
			<a
				href={pageHref(next)}
				class="border-ink/25 bg-paper press rounded-pill inline-flex min-h-11 items-center border px-4 py-2 text-sm font-medium"
			>
				Page suivante
			</a>
		{:else}
			<span></span>
		{/if}
	</nav>
{/if}
