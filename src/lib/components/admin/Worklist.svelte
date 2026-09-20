<script lang="ts">
	import type { WorkItem } from '$lib/shared/admin/worklist';

	interface Props {
		items: readonly WorkItem[];
	}

	let { items }: Props = $props();

	const urgent = $derived(items.filter((item) => item.tone === 'urgent').length);
</script>

<!--
	La liste des choses a faire, en tete du tableau de bord parce que c'est la
	seule question a laquelle on veut une reponse en arrivant.

	Chaque ligne est un lien : on lit la tache et on est deja sur l'ecran qui la
	resout. Une alerte qu'il faut aller chercher n'est pas une alerte.
-->
<section class="panel overflow-hidden">
	<header class="border-ink/12 flex flex-wrap items-baseline justify-between gap-2 border-b px-5 py-4">
		<h2 class="text-base font-semibold">À faire</h2>
		{#if urgent > 0}
			<!-- Le mot, pas seulement la couleur : « en retard » se lit sans distinguer
			     le rouge du noir. -->
			<p class="text-danger text-sm font-semibold">
				{urgent} point{urgent > 1 ? 's' : ''} en retard
			</p>
		{/if}
	</header>

	{#if items.length === 0}
		<div class="p-5">
			<p class="font-semibold">Rien n'attend.</p>
			<p class="text-muted mt-1 text-sm">
				Aucun brouillon en souffrance, aucune publication en retard, aucune synchronisation
				tombée. C'est l'état normal, pas un écran vide.
			</p>
		</div>
	{:else}
		<ul class="divide-ink/10 divide-y">
			{#each items as item (item.key)}
				<li>
					<a
						href={item.href}
						class="hover:bg-cream flex min-h-11 items-baseline gap-3 px-5 py-3.5"
					>
						<!--
							Le point est decoratif et le dit : ce qui distingue une urgence
							d'une tache, c'est la mention « en retard » au-dessus et l'ordre
							de la liste, jamais la pastille seule.
						-->
						<span
							aria-hidden="true"
							class="mt-1.5 h-2 w-2 shrink-0 rounded-full {item.tone === 'urgent'
								? 'bg-danger'
								: 'bg-ink/30'}"
						></span>
						<span class="min-w-0 flex-1">
							<span class="block font-medium underline decoration-2 underline-offset-2">
								{item.label}
							</span>
							<span class="text-muted mt-0.5 block text-sm">{item.detail}</span>
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>
