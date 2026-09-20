<script lang="ts">
	import Button from '$components/Button.svelte';
	import ContentBlocks from '$components/ContentBlocks.svelte';
	import { formatCount, formatDate } from '$shared/format';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Répondre à une enquête, Humanitour</title>
	<meta
		name="description"
		content="Les enquêtes d'Humanitour ouvertes aux réponses. Quelques minutes, aucun compte à créer, et vos réponses sont publiées en données brutes."
	/>
</svelte:head>

{#snippet list()}
	<ul class="mt-12 grid gap-5 sm:grid-cols-2">
		{#each data.surveys as survey (survey.slug)}
			<li class="block-card bg-paper flex flex-col gap-3 p-6">
				<h2 class="text-2xl">{survey.title}</h2>
				{#if survey.subtitle}
					<p class="text-muted">{survey.subtitle}</p>
				{/if}
				{#if survey.description}
					<p class="measure text-sm leading-relaxed">{survey.description}</p>
				{/if}

				<p class="text-muted mt-auto text-sm">
					{formatCount(survey.responses)} réponse{survey.responses > 1 ? 's' : ''} déjà publiée{survey.responses >
					1
						? 's'
						: ''}{#if survey.closesAt}&nbsp;· ouverte jusqu'au {formatDate(survey.closesAt)}{/if}
				</p>

				<div class="mt-2">
					<Button href="/repondre/{survey.slug}" variant="brand">Répondre à cette enquête</Button>
				</div>
			</li>
		{/each}
	</ul>
{/snippet}

<ContentBlocks
	blocks={data.blocks}
	tokens={data.tokens}
	team={data.team}
	catalogue={{ empty: data.surveys.length === 0, body: list }}
/>
