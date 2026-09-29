<script lang="ts">
	import { enhance } from '$app/forms';
	import { closeAfter } from '$components/admin/enhance';
	import Dialog from '$components/admin/Dialog.svelte';
	import EmptyState from '$components/admin/EmptyState.svelte';
	import Flash from '$components/admin/Flash.svelte';
	import { formatCount } from '$lib/shared/format';
	import { formatListDate } from '$lib/shared/mail/dates';
	import { STATUS_LABELS, isProblem } from '$lib/shared/mail/status';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const base = $derived(`/admin/courrier/${data.mailbox.id}`);

	let selected: string[] = $state([]);
	let confirmingEmpty = $state(false);

	// Changer de vue, de page ou de recherche vide la selection : cocher un fil
	// puis changer de dossier ne doit pas agir sur un fil qu'on ne voit plus.
	$effect.pre(() => {
		void data.threads;
		selected = [];
	});

	const allSelected = $derived(data.threads.length > 0 && selected.length === data.threads.length);

	function toggleAll() {
		selected = allSelected ? [] : data.threads.map((thread) => thread.id);
	}

	/** Les deplacements utiles depuis la vue en cours : on n'archive pas ce qui l'est deja. */
	const moves = $derived(
		[
			{ op: 'reception', label: 'Remettre en réception', hidden: data.view.key === 'reception' },
			{
				op: 'archiver',
				label: 'Archiver',
				hidden: data.view.key === 'archives' || data.view.key === 'corbeille'
			},
			{ op: 'indesirable', label: 'Indésirable', hidden: data.view.key === 'indesirables' },
			{ op: 'corbeille', label: 'Corbeille', hidden: data.view.key === 'corbeille' },
			{ op: 'lu', label: 'Marquer comme lu', hidden: false },
			{ op: 'nonlu', label: 'Marquer comme non lu', hidden: false }
		].filter((move) => !move.hidden)
	);

	function pageHref(target: number): string {
		const parts = [`dossier=${data.view.key}`];
		if (data.search !== '') parts.push(`q=${encodeURIComponent(data.search)}`);
		if (target > 1) parts.push(`page=${target}`);
		return `?${parts.join('&')}`;
	}

	/** Qui parle dans la liste : l'expediteur d'un message recu, les destinataires d'un envoi. */
	function correspondent(thread: PageData['threads'][number]): string {
		if (thread.last?.direction === 'INBOUND')
			return thread.last.fromName ?? thread.last.fromAddress;
		const list = thread.participants.slice(0, 2).join(', ');
		return list === '' ? 'Brouillon' : `À : ${list}`;
	}

	const button =
		'border-ink/25 bg-paper press rounded-pill inline-flex min-h-11 items-center border px-3 py-1.5 text-sm disabled:opacity-50';
</script>

<svelte:head><title>{data.view.label}, {data.mailbox.address}</title></svelte:head>

<header class="mb-4 flex flex-wrap items-end justify-between gap-3">
	<div>
		<h1 class="text-2xl font-bold tracking-tight">{data.view.label}</h1>
		<p class="text-muted text-sm">{data.mailbox.displayName} · {data.mailbox.address}</p>
	</div>

	<form method="GET" class="flex items-center gap-2" role="search">
		<input type="hidden" name="dossier" value={data.view.key} />
		<label class="sr-only" for="recherche-courrier"
			>Chercher dans {data.view.label.toLowerCase()}</label
		>
		<input
			id="recherche-courrier"
			type="search"
			name="q"
			value={data.search}
			placeholder="Objet, expéditeur, texte"
			class="border-ink/20 bg-paper rounded-field min-h-11 w-60 max-w-full border px-3 py-2 text-sm"
		/>
		<button type="submit" class={button}>Chercher</button>
	</form>
</header>

<Flash message={form?.message} />

{#if data.search !== ''}
	<p class="text-muted mb-3 text-sm" role="status">
		{formatCount(data.total)} fil{data.total > 1 ? 's' : ''} pour « {data.search} ».
		<a href="?dossier={data.view.key}" class="underline decoration-2 underline-offset-2"
			>Tout afficher</a
		>
	</p>
{/if}

{#if data.threads.length === 0}
	<EmptyState
		title={data.search === '' ? 'Rien ici' : 'Aucun fil ne correspond'}
		description={data.search === ''
			? data.view.empty
			: 'Essayez un autre mot, ou cherchez dans un autre dossier.'}
	/>
{:else}
	<form
		id="bulk"
		method="POST"
		action="?/bulk"
		use:enhance
		class="mb-2 flex flex-wrap items-center gap-2"
	>
		<label class="inline-flex min-h-11 items-center gap-2 px-2 text-sm">
			<input type="checkbox" checked={allSelected} onchange={toggleAll} class="accent-ink size-4" />
			<span
				>{selected.length > 0
					? `${selected.length} sélectionné${selected.length > 1 ? 's' : ''}`
					: 'Tout sélectionner'}</span
			>
		</label>
		{#each moves as move (move.op)}
			<button
				type="submit"
				name="op"
				value={move.op}
				disabled={selected.length === 0}
				class={button}
			>
				{move.label}
			</button>
		{/each}
		{#if data.view.key === 'corbeille'}
			<button
				type="button"
				onclick={() => (confirmingEmpty = true)}
				class="{button} text-danger ml-auto"
			>
				Vider la corbeille
			</button>
		{/if}
	</form>

	<ul class="panel divide-ink/10 divide-y overflow-hidden">
		{#each data.threads as thread (thread.id)}
			<li class="flex items-stretch gap-1 {thread.unread ? 'bg-paper' : 'bg-cream/60'}">
				<label class="flex min-h-11 shrink-0 items-center px-3">
					<span class="sr-only">Sélectionner « {thread.subject} »</span>
					<input
						type="checkbox"
						form="bulk"
						name="ids"
						value={thread.id}
						bind:group={selected}
						class="accent-ink size-4"
					/>
				</label>

				<form method="POST" action="?/bulk" use:enhance class="flex shrink-0 items-center">
					<input type="hidden" name="ids" value={thread.id} />
					<button
						type="submit"
						name="op"
						value={thread.starred ? 'nepassuivre' : 'suivre'}
						aria-pressed={thread.starred}
						title={thread.starred ? 'Ne plus suivre' : 'Suivre ce fil'}
						class="inline-flex size-11 items-center justify-center text-lg"
					>
						<span aria-hidden="true" class={thread.starred ? 'text-coral-ink' : 'text-ink/30'}
							>★</span
						>
						<span class="sr-only"
							>{thread.starred ? 'Ne plus suivre' : 'Suivre'} « {thread.subject} »</span
						>
					</button>
				</form>

				<!-- Pas de prechargement au survol : ouvrir un fil le marque comme lu,
				     et un simple passage de souris ne doit pas le faire. -->
				<a
					href="{base}/fil/{thread.id}"
					data-sveltekit-preload-data="off"
					class="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 py-2.5 pr-4"
				>
					<span class="truncate text-sm {thread.unread ? 'font-bold' : ''}">
						{correspondent(thread)}
						{#if thread.count > 1}<span class="text-muted font-normal"> ({thread.count})</span>{/if}
					</span>
					<span class="text-muted font-mono text-xs whitespace-nowrap">
						{formatListDate(thread.lastMessageAt)}
					</span>
					<span class="col-span-2 truncate text-sm">
						<span class={thread.unread ? 'font-semibold' : ''}>{thread.subject}</span>
						{#if thread.snippet}<span class="text-muted"> · {thread.snippet}</span>{/if}
					</span>
					{#if thread.hasAttachments || (thread.last && isProblem(thread.last.status))}
						<span class="col-span-2 mt-0.5 flex flex-wrap gap-2 text-xs">
							{#if thread.hasAttachments}<span class="text-muted">Pièce jointe</span>{/if}
							{#if thread.last && isProblem(thread.last.status)}
								<span class="text-danger font-semibold">{STATUS_LABELS[thread.last.status]}</span>
							{/if}
						</span>
					{/if}
				</a>
			</li>
		{/each}
	</ul>

	{#if data.pages > 1}
		<nav class="mt-4 flex items-center justify-between gap-3" aria-label="Pages de la liste">
			{#if data.page > 1}
				<a href={pageHref(data.page - 1)} class={button}>Plus récents</a>
			{:else}<span></span>{/if}
			<p class="text-muted text-sm">Page {data.page} sur {data.pages}</p>
			{#if data.page < data.pages}
				<a href={pageHref(data.page + 1)} class={button}>Plus anciens</a>
			{:else}<span></span>{/if}
		</nav>
	{/if}
{/if}

<Dialog
	open={confirmingEmpty}
	title="Vider la corbeille ?"
	onClose={() => (confirmingEmpty = false)}
>
	<p>
		Les fils de la corbeille et leurs pièces jointes seront supprimés définitivement. Rien ne se
		récupère ensuite.
	</p>
	{#snippet footer()}
		<button type="button" onclick={() => (confirmingEmpty = false)} class={button}>Annuler</button>
		<form
			method="POST"
			action="?/emptyTrash"
			use:enhance={closeAfter(() => (confirmingEmpty = false))}
		>
			<button
				type="submit"
				class="bg-danger text-paper press rounded-pill inline-flex min-h-11 items-center px-4 py-2 text-sm font-semibold"
			>
				Supprimer définitivement
			</button>
		</form>
	{/snippet}
</Dialog>
