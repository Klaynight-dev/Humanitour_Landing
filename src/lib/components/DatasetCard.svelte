<script lang="ts">
	import { formatCount, formatFieldwork } from '$shared/format';

	/**
	 * Une enquete dans le catalogue.
	 *
	 * Meme forme que `MediaCard` : meme bloc, meme etiquette, meme pied. Les deux
	 * catalogues du site se parcourent donc de la meme facon, et ce qui change
	 * d une carte a l autre est ce qu elle porte, pas sa mise en page.
	 */
	interface Props {
		survey: {
			slug: string;
			title: string;
			subtitle: string | null;
			fieldworkStart: Date | null;
			fieldworkEnd: Date | null;
			responseCount: number;
			questionCount: number;
			/** Libelles de questions qui ont repondu a la recherche. */
			matches?: readonly string[];
		};
	}

	let { survey }: Props = $props();
</script>

<article class="block-card press flex h-full flex-col overflow-hidden">
	<div class="flex flex-1 flex-col p-5">
		<div class="flex flex-wrap items-center gap-2 text-xs">
			<!-- L effectif est l etiquette la plus utile d un jeu de donnees : il dit
			     avant le clic ce qu on pourra en tirer. -->
			<span class="bg-coral-wash text-coral-ink rounded-pill px-3 py-1 font-semibold">
				<span class="tabular">{formatCount(survey.responseCount)}</span> réponses
			</span>
			<span class="text-muted">
				<span class="tabular">{formatCount(survey.questionCount)}</span> questions
			</span>
		</div>

		<h3 class="font-display mt-3 text-lg leading-snug font-semibold">
			<a href="/donnees/{survey.slug}" class="hover:underline">{survey.title}</a>
		</h3>

		{#if survey.subtitle}
			<p class="text-ink-soft mt-2 text-sm leading-relaxed">{survey.subtitle}</p>
		{/if}

		{#if survey.matches && survey.matches.length > 0}
			<!-- Ce qui a repondu a la recherche, ecrit noir sur blanc : sans cela, un
			     resultat dont le titre ne contient pas le mot cherche parait la par
			     erreur. -->
			<ul class="text-muted mt-3 flex flex-col gap-1 text-xs">
				{#each survey.matches as label (label)}
					<li>Question : « {label} »</li>
				{/each}
			</ul>
		{/if}

		<p class="text-muted mt-auto pt-4 text-xs">
			{formatFieldwork(survey.fieldworkStart, survey.fieldworkEnd)}
		</p>
	</div>
</article>
