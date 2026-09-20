<script lang="ts">
	import { formatCount } from '$lib/shared/format';
	import { changeRatio } from '$lib/shared/admin/worklist';

	interface Props {
		label: string;
		total: number;
		/** Les deux fenetres de trente jours qui permettent de comparer. */
		current?: number;
		previous?: number;
		/** Ce que le total recouvre, en une ligne : « dont 12 en ligne ». */
		detail?: string;
		href?: string;
		linkLabel?: string;
	}

	let { label, total, current, previous, detail, href, linkLabel }: Props = $props();

	/**
	 * La variation sur trente jours, ou `null`.
	 *
	 * `null` quand la periode precedente est vide : ce depot reproche aux
	 * instituts de fabriquer des chiffres, il ne peut pas afficher « +100 % »
	 * parce qu'on est passe de zero a un (AGENTS.md section 0).
	 */
	const ratio = $derived(
		current === undefined || previous === undefined ? null : changeRatio(current, previous)
	);

	/*
	 * La fleche ne code jamais seule : elle double un signe et un mot. Une
	 * variation lue a la couleur ou a la forme seule disparait pour qui ne
	 * distingue pas les deux.
	 */
	const arrow = $derived(ratio === null || ratio === 0 ? '' : ratio > 0 ? '↑' : '↓');
</script>

<article class="panel flex flex-col p-5">
	<h3 class="text-muted text-sm font-semibold">{label}</h3>
	<p class="tabular mt-1 text-3xl font-semibold">{formatCount(total)}</p>

	{#if detail}
		<p class="text-muted mt-1 text-sm">{detail}</p>
	{/if}

	{#if ratio !== null && current !== undefined}
		<p class="text-muted mt-2 text-sm">
			<span class="text-ink font-semibold">
				{arrow}{ratio > 0 ? '+' : ''}{ratio} %
			</span>
			sur trente jours, soit {formatCount(current)} de plus
		</p>
	{:else if current !== undefined && current > 0}
		<!--
			Sans periode precedente, on donne le nombre brut plutot qu'un
			pourcentage : c'est vrai, et ca ne fait pas semblant de mesurer une
			tendance sur un seul point.
		-->
		<p class="text-muted mt-2 text-sm">{formatCount(current)} sur trente jours</p>
	{/if}

	{#if href && linkLabel}
		<a href={href} class="text-coral-ink mt-4 inline-block text-sm underline">{linkLabel}</a>
	{/if}
</article>
