<script lang="ts">
	import PageHeader from '$components/admin/PageHeader.svelte';
	import Panel from '$components/admin/Panel.svelte';
	import StatusBadge from '$components/admin/StatusBadge.svelte';
	import TrendChart from '$components/admin/TrendChart.svelte';
	import { formatCount, formatDate } from '$lib/shared/format';
	import { can } from '$lib/shared/permissions';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const published = $derived(
		data.surveyStatuses.find((row) => row.status === 'PUBLISHED')?.count ?? 0
	);
	const publishedMedia = $derived(
		data.mediaStatuses.find((row) => row.status === 'PUBLISHED')?.count ?? 0
	);
	const rejectedRows = $derived(data.imports.reduce((total, row) => total + row.rejected, 0));
</script>

<svelte:head><title>Back-office, Humanitour</title></svelte:head>

<PageHeader
	title="Bonjour {data.user.displayName}"
	description="Vous êtes connecté avec le rôle « {data.user.role.name} »."
/>

<div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
	{#if can(data.user, 'survey.read')}
		<Panel title="Sondages">
			<p class="tabular text-3xl font-semibold">{formatCount(data.surveys)}</p>
			<p class="text-muted mt-1 text-sm">dont {formatCount(published)} publiés</p>
			<a href="/admin/sondages" class="text-coral-ink mt-4 inline-block text-sm underline">
				Gérer les sondages
			</a>
		</Panel>

		<Panel title="Réponses collectées">
			<p class="tabular text-3xl font-semibold">{formatCount(data.responses)}</p>
			<p class="text-muted mt-1 text-sm">toutes enquêtes confondues</p>
		</Panel>

		<Panel title="Lignes rejetées à l'import">
			<p class="tabular text-3xl font-semibold">{formatCount(rejectedRows)}</p>
			<p class="text-muted mt-1 text-sm">jamais masquées, toujours consultables par lot</p>
		</Panel>
	{/if}

	{#if can(data.user, 'media.read')}
		<Panel title="Médiathèque">
			<p class="tabular text-3xl font-semibold">{formatCount(data.media)}</p>
			<p class="text-muted mt-1 text-sm">dont {formatCount(publishedMedia)} en ligne</p>
			<a href="/admin/medias" class="text-coral-ink mt-4 inline-block text-sm underline">
				Gérer la médiathèque
			</a>
		</Panel>
	{/if}
</div>

{#if data.trend}
	<div class="mt-6">
		<Panel
			title="Collecte dans le temps"
			description="Réponses par semaine, d'après la date d'entretien et non la date d'import."
		>
			<TrendChart points={data.trend.points} caption="Réponses collectées par semaine" />
		</Panel>
	</div>
{/if}

<div class="mt-6 grid gap-5 lg:grid-cols-2">
	{#if can(data.user, 'survey.read') && data.imports.length > 0}
		<Panel title="Imports" description="Où en sont les lots déposés.">
			<ul class="flex flex-col gap-3">
				{#each data.imports as batch (batch.status)}
					<li class="flex flex-wrap items-center justify-between gap-3">
						<StatusBadge status={batch.status} />
						<span class="tabular text-muted text-sm">
							{formatCount(batch.batches)} lot{batch.batches > 1 ? 's' : ''},
							{formatCount(batch.accepted)} ligne{batch.accepted > 1 ? 's' : ''} retenue{batch.accepted >
							1
								? 's'
								: ''}
							{#if batch.rejected > 0}, {formatCount(batch.rejected)} rejetée{batch.rejected > 1
									? 's'
									: ''}{/if}
						</span>
					</li>
				{/each}
			</ul>
		</Panel>
	{/if}

	{#if can(data.user, 'audit.read') && data.team.length > 0}
		<Panel title="Activité de l'équipe" description="Actions journalisées sur trente jours.">
			<ul class="flex flex-col gap-2">
				{#each data.team as member (member.actor)}
					<li class="flex items-baseline justify-between gap-3 text-sm">
						<span class="font-medium">{member.actor}</span>
						<span class="tabular text-muted">{formatCount(member.actions)}</span>
					</li>
				{/each}
			</ul>
		</Panel>
	{/if}
</div>

{#if can(data.user, 'audit.read') && data.recentAudit.length > 0}
	<div class="mt-6">
		<Panel title="Dernières actions" description="Qui a publié quoi, et quand.">
			<ul class="flex flex-col gap-2">
				{#each data.recentAudit as event (event.id)}
					<li class="flex flex-wrap items-baseline justify-between gap-2 text-sm">
						<span>
							<code class="bg-cream rounded px-1.5 py-0.5 text-xs">{event.action}</code>
							<span class="text-muted ml-2">{event.entity}</span>
						</span>
						<span class="text-muted text-xs">
							{event.actor?.displayName ?? 'Système'}, {formatDate(event.createdAt)}
						</span>
					</li>
				{/each}
			</ul>
			<a href="/admin/journal" class="text-coral-ink mt-4 inline-block text-sm underline">
				Ouvrir le journal
			</a>
		</Panel>
	</div>
{/if}
