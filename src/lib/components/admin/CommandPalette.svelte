<script lang="ts">
	import { goto } from '$app/navigation';
	import Dialog from './Dialog.svelte';

	interface Hit {
		readonly kind: string;
		readonly title: string;
		readonly subtitle: string;
		readonly href: string;
	}

	const KIND_LABELS: Record<string, string> = {
		survey: 'Sondage',
		media: 'Média',
		user: 'Compte'
	};

	let open = $state(false);
	let query = $state('');
	let results: Hit[] = $state([]);
	let active = $state(0);
	let inputEl: HTMLInputElement | undefined = $state();

	/**
	 * Seul endroit du back-office qui interroge le serveur en JavaScript : une
	 * recherche au fil de la frappe ne peut pas passer par un rechargement. La
	 * page `/admin/recherche` reste la voie sans script, et le meme garde de
	 * permission s applique aux deux.
	 */
	let timer: ReturnType<typeof setTimeout> | undefined;
	let sequence = 0;

	function schedule(value: string) {
		clearTimeout(timer);
		if (value.trim() === '') {
			results = [];
			return;
		}
		timer = setTimeout(() => void run(value), 180);
	}

	async function run(value: string) {
		// Les reponses peuvent revenir dans le desordre : on n affiche que la
		// derniere demandee, sinon une frappe rapide ecrase le bon resultat.
		const ticket = ++sequence;
		try {
			const response = await fetch(`/admin/api/recherche?q=${encodeURIComponent(value)}`);
			if (!response.ok) return;
			const payload: { results: Hit[] } = await response.json();
			if (ticket !== sequence) return;
			results = payload.results;
			active = 0;
		} catch {
			// Une recherche qui echoue ne doit pas casser l ecran : la palette reste
			// ouverte et vide, la page de recherche complete prend le relais.
			if (ticket === sequence) results = [];
		}
	}

	function show() {
		open = true;
		query = '';
		results = [];
		active = 0;
		// Le focus attend l ouverture reelle du dialogue natif.
		queueMicrotask(() => inputEl?.focus());
	}

	function onWindowKeydown(event: KeyboardEvent) {
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			show();
		}
	}

	function onFieldKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			active = results.length === 0 ? 0 : (active + 1) % results.length;
			return;
		}
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			active = results.length === 0 ? 0 : (active - 1 + results.length) % results.length;
			return;
		}
		if (event.key !== 'Enter') return;

		event.preventDefault();
		const chosen = results.at(active);
		open = false;
		// Sans resultat choisi, Entree mene a la page de recherche complete plutot
		// que de ne rien faire.
		void goto(chosen ? chosen.href : `/admin/recherche?q=${encodeURIComponent(query)}`);
	}
</script>

<svelte:window onkeydown={onWindowKeydown} />

<Dialog {open} title="Rechercher" onClose={() => (open = false)}>
	<label class="sr-only" for="palette-champ">Votre recherche</label>
	<input
		bind:this={inputEl}
		id="palette-champ"
		type="search"
		bind:value={query}
		oninput={() => schedule(query)}
		onkeydown={onFieldKeydown}
		placeholder="Un sondage, un média, un compte"
		class="border-ink/20 bg-paper rounded-field min-h-11 w-full border px-3 py-2"
	/>

	{#if results.length > 0}
		<ul class="mt-3 flex flex-col gap-1">
			{#each results as hit, index (hit.href + hit.title)}
				<li>
					<a
						href={hit.href}
						onclick={() => (open = false)}
						class="rounded-field flex min-h-11 items-center justify-between gap-3 px-3 py-2 {index ===
						active
							? 'bg-cream'
							: 'hover:bg-cream'}"
					>
						<span class="min-w-0">
							<span class="block truncate text-sm font-medium">{hit.title}</span>
							{#if hit.subtitle}
								<span class="text-muted block truncate text-xs">{hit.subtitle}</span>
							{/if}
						</span>
						<span class="text-muted shrink-0 text-xs">{KIND_LABELS[hit.kind] ?? hit.kind}</span>
					</a>
				</li>
			{/each}
		</ul>
	{:else if query.trim() !== ''}
		<p class="text-muted mt-3 text-sm">Aucun résultat pour « {query} ».</p>
	{/if}

	{#snippet footer()}
		<p class="text-muted mr-auto text-xs">↑ ↓ pour circuler, Entrée pour ouvrir, Échap pour fermer</p>
		<button
			type="button"
			onclick={() => (open = false)}
			class="border-ink/25 press bg-paper rounded-pill inline-flex min-h-11 items-center justify-center border px-4 py-2 text-sm font-medium"
		>
			Fermer
		</button>
	{/snippet}
</Dialog>
