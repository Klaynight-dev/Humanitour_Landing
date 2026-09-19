<script lang="ts">
	import type { TrendPoint } from '$lib/server/dashboard/trends';
	import { formatCount, SUPPRESSED_LABEL, SUPPRESSED_SYMBOL } from '$lib/shared/format';

	interface Props {
		points: readonly TrendPoint[];
		/** Legende du graphique, affichee au-dessus. */
		caption: string;
	}

	let { points, caption }: Props = $props();

	// L echelle se cale sur le plus haut effectif publie. Une tranche masquee ne
	// participe pas : sa hauteur trahirait l effectif qu on vient de masquer.
	const maxCount = $derived(Math.max(1, ...points.map((point) => point.count ?? 0)));
</script>

<figure class="flex flex-col gap-4">
	<figcaption class="text-ink-soft text-sm">{caption}</figcaption>

	{#if points.length === 0}
		<p class="text-muted text-sm">Aucune réponse collectée pour le moment.</p>
	{:else}
		<!-- Barres verticales plutot qu une courbe tracee : une tranche masquee n a
		     pas de valeur, et une courbe reliant ses voisines la ferait deviner. -->
		<ul class="flex h-40 items-end gap-1" role="list">
			{#each points as point (point.key)}
				{@const height = point.count === null ? 100 : (point.count / maxCount) * 100}
				<li class="flex h-full flex-1 flex-col justify-end" title="{point.label} : {point.suppressed ? SUPPRESSED_LABEL : formatCount(point.count)}">
					<div
						class="rounded-t-sm {point.suppressed ? 'bg-muted/30' : 'bg-coral'}"
						style:height="{Math.max(height, 2)}%"
						style:background-image={point.suppressed
							? 'repeating-linear-gradient(45deg, transparent 0 4px, rgba(0,0,0,.08) 4px 8px)'
							: undefined}
					></div>
				</li>
			{/each}
		</ul>

		<table class="sr-only">
			<caption>{caption}</caption>
			<thead>
				<tr><th scope="col">Semaine du</th><th scope="col">Réponses</th></tr>
			</thead>
			<tbody>
				{#each points as point (point.key)}
					<tr>
						<th scope="row">{point.label}</th>
						<td>{point.suppressed ? SUPPRESSED_LABEL : formatCount(point.count)}</td>
					</tr>
				{/each}
			</tbody>
		</table>

		<p class="text-muted flex justify-between text-xs">
			<span>{points.at(0)?.label}</span>
			<span>{points.at(-1)?.label}</span>
		</p>

		{#if points.some((point) => point.suppressed)}
			<p class="text-muted text-xs">
				{SUPPRESSED_SYMBOL} Les semaines sous le seuil d'anonymat sont masquées, ici comme dans les
				données publiées.
			</p>
		{/if}
	{/if}
</figure>
