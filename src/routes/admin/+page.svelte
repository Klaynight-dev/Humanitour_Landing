<script lang="ts">
	import PageHeader from '$components/admin/PageHeader.svelte';
	import Panel from '$components/admin/Panel.svelte';
	import { formatCount, formatDate } from '$lib/shared/format';
	import { can } from '$lib/shared/permissions';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Back-office — Humanitour</title></svelte:head>

<PageHeader
	title="Bonjour {data.user.displayName}"
	description="Vous etes connecte avec le role « {data.user.role.name} »."
/>

<div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
	{#if can(data.user, 'survey.read')}
		<Panel title="Sondages">
			<p class="tabular font-display text-3xl font-semibold">{formatCount(data.surveys)}</p>
			<p class="text-muted mt-1 text-sm">
				dont {formatCount(data.publishedSurveys)} publie{data.publishedSurveys > 1 ? 's' : ''}
			</p>
			<a href="/admin/sondages" class="text-coral-700 mt-4 inline-block text-sm underline">
				Gerer les sondages
			</a>
		</Panel>

		<Panel title="Reponses collectees">
			<p class="tabular font-display text-3xl font-semibold">{formatCount(data.responses)}</p>
			<p class="text-muted mt-1 text-sm">toutes enquetes confondues</p>
		</Panel>
	{/if}

	{#if can(data.user, 'media.read')}
		<Panel title="Mediatheque">
			<p class="tabular font-display text-3xl font-semibold">{formatCount(data.media)}</p>
			<p class="text-muted mt-1 text-sm">
				dont {formatCount(data.publishedMedia)} en ligne
			</p>
			<a href="/admin/medias" class="text-coral-700 mt-4 inline-block text-sm underline">
				Gerer la mediatheque
			</a>
		</Panel>
	{/if}
</div>

{#if can(data.user, 'audit.read') && data.recentAudit.length > 0}
	<div class="mt-6">
		<Panel title="Dernieres actions" description="Qui a publie quoi, et quand.">
			<ul class="flex flex-col gap-2">
				{#each data.recentAudit as event (event.id)}
					<li class="flex flex-wrap items-baseline justify-between gap-2 text-sm">
						<span>
							<code class="bg-surface rounded px-1.5 py-0.5 text-xs">{event.action}</code>
							<span class="text-muted ml-2">{event.entity}</span>
						</span>
						<span class="text-muted text-xs">
							{event.actor?.displayName ?? 'Systeme'} — {formatDate(event.createdAt)}
						</span>
					</li>
				{/each}
			</ul>
		</Panel>
	</div>
{/if}
