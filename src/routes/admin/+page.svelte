<script lang="ts">
	import PageHeader from '$components/admin/PageHeader.svelte';
	import Panel from '$components/admin/Panel.svelte';
	import StatTile from '$components/admin/StatTile.svelte';
	import StatusBadge from '$components/admin/StatusBadge.svelte';
	import TrendChart from '$components/admin/TrendChart.svelte';
	import Worklist from '$components/admin/Worklist.svelte';
	import { visibleNavigation } from '$lib/shared/admin/navigation';
	import { buildWorklist } from '$lib/shared/admin/worklist';
	import { formatCount, formatDate } from '$lib/shared/format';
	import { can } from '$lib/shared/permissions';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const work = $derived(buildWorklist(data.work, data.user));
	const shortcuts = $derived(visibleNavigation(data.user).flatMap((section) => section.links));

	const published = $derived(
		data.surveyStatuses.find((row) => row.status === 'PUBLISHED')?.count ?? 0
	);
	const rejectedRows = $derived(data.syncs.reduce((total, row) => total + row.rejected, 0));
</script>

<svelte:head><title>Back-office, Humanitour</title></svelte:head>

<PageHeader
	title="Bonjour {data.user.displayName}"
	description="Vous êtes connecté avec le rôle « {data.user.role.name} »."
/>

<!--
	Trois etages, dans l'ordre des questions qu'on se pose en arrivant : ce qui
	attend, ou je vais, ou on en est. La liste « a faire » est le point focal de
	l'ecran, seule sur sa ligne a partir de `lg`.
-->
<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
	<Worklist items={work} />

	<Panel title="Aller directement à" description="Les sections que votre rôle vous ouvre.">
		<ul class="flex flex-col gap-1">
			{#each shortcuts as link (link.href)}
				<li>
					<a
						href={link.href}
						class="hover:bg-cream rounded-field -mx-2 flex min-h-11 flex-col justify-center px-2 py-1.5"
					>
						<span class="font-medium underline decoration-2 underline-offset-2">{link.label}</span>
						<span class="text-muted text-xs">{link.description}</span>
					</a>
				</li>
			{/each}
		</ul>
	</Panel>
</div>

<h2 class="mt-10 mb-4 text-lg font-semibold">Où on en est</h2>

<div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
	{#if can(data.user, 'survey.read')}
		<StatTile
			label="Sondages"
			total={data.surveys}
			detail="dont {formatCount(published)} publiés"
			href="/admin/sondages"
			linkLabel="Gérer les sondages"
		/>

		<StatTile
			label="Réponses collectées"
			total={data.responses.total}
			current={data.responses.current}
			previous={data.responses.previous}
			detail="toutes enquêtes confondues"
		/>

		<StatTile
			label="Réponses rejetées"
			total={rejectedRows}
			detail="jamais masquées, consultables passe par passe"
		/>
	{/if}

	{#if can(data.user, 'media.read')}
		<StatTile
			label="Médiathèque"
			total={data.media.total}
			current={data.media.current}
			previous={data.media.previous}
			detail="dont {formatCount(data.mediaPublished)} en ligne"
			href="/admin/medias"
			linkLabel="Gérer la médiathèque"
		/>
	{/if}

	{#if can(data.user, 'newsletter.read')}
		<StatTile
			label="Abonnés à l'infolettre"
			total={data.subscribers.total}
			current={data.subscribers.current}
			previous={data.subscribers.previous}
			href="/admin/infolettre"
			linkLabel="Ouvrir l'infolettre"
		/>
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
	{#if can(data.user, 'survey.read') && data.syncs.length > 0}
		<Panel
			title="Synchronisation Openforms"
			description="Ce que les passes ont rapporté depuis forms.humanitour.fr."
		>
			<ul class="flex flex-col gap-3">
				{#each data.syncs as pass (pass.status)}
					<li class="flex flex-wrap items-center justify-between gap-3">
						<StatusBadge status={pass.status} />
						<span class="tabular text-muted text-sm">
							{formatCount(pass.passes)} passe{pass.passes > 1 ? 's' : ''},
							{formatCount(pass.created)} réponse{pass.created > 1 ? 's' : ''} reprise{pass.created >
							1
								? 's'
								: ''}
							{#if pass.rejected > 0}, {formatCount(pass.rejected)} rejetée{pass.rejected > 1
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
