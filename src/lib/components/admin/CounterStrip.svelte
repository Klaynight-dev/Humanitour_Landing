<script lang="ts">
	import { formatCount } from '$lib/shared/format';
	import { changeRatio } from '$lib/shared/admin/worklist';

	export interface Counter {
		readonly label: string;
		readonly total: number;
		readonly href?: string;
		/** Les deux fenetres de trente jours qui permettent de comparer. */
		readonly current?: number;
		readonly previous?: number;
	}

	interface Props {
		counters: readonly Counter[];
	}

	let { counters }: Props = $props();

	/**
	 * `null` quand la periode precedente est vide : ce depot reproche aux
	 * instituts de fabriquer des chiffres, il ne peut pas afficher « +100 % »
	 * parce qu'on est passe de zero a un (AGENTS.md section 0).
	 */
	function ratio(counter: Counter): number | null {
		if (counter.current === undefined || counter.previous === undefined) return null;
		return changeRatio(counter.current, counter.previous);
	}
</script>

<!--
	Le bandeau de compteurs, en tete du tableau de bord.

	Une seule ligne qui se replie : les chiffres sont un reperage, pas le sujet
	de l'ecran. Ils tiennent donc en hauteur d'une ligne de titre, et la place
	gagnee va aux listes qui, elles, demandent une action.
-->
<div class="panel divide-ink/12 mb-5 grid divide-y sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
	{#each counters as counter (counter.label)}
		{@const change = ratio(counter)}
		<div class="px-4 py-3">
			<p class="text-muted text-xs font-semibold tracking-wide uppercase">{counter.label}</p>
			<p class="mt-0.5 flex items-baseline gap-2">
				{#if counter.href}
					<a href={counter.href} class="tabular text-2xl font-semibold underline decoration-2 underline-offset-4">
						{formatCount(counter.total)}
					</a>
				{:else}
					<span class="tabular text-2xl font-semibold">{formatCount(counter.total)}</span>
				{/if}

				{#if change !== null}
					<!-- La fleche double le signe et le mot : une variation lue a la
					     couleur ou a la forme seule disparait pour qui ne distingue pas
					     les deux. -->
					<span class="text-muted text-xs">
						{change > 0 ? '↑' : change < 0 ? '↓' : ''}{change > 0 ? '+' : ''}{change} % sur 30 j
					</span>
				{:else if counter.current !== undefined && counter.current > 0}
					<span class="text-muted text-xs">{formatCount(counter.current)} sur 30 j</span>
				{/if}
			</p>
		</div>
	{/each}
</div>
