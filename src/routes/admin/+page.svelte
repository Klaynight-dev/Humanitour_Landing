<script lang="ts">
	import CounterStrip, { type Counter } from '$components/admin/CounterStrip.svelte';
	import ListPanel from '$components/admin/ListPanel.svelte';
	import PageHeader from '$components/admin/PageHeader.svelte';
	import StatusBadge from '$components/admin/StatusBadge.svelte';
	import { buildWorklist } from '$lib/shared/admin/worklist';
	import { formatCount, formatDate } from '$lib/shared/format';
	import { can } from '$lib/shared/permissions';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	/**
	 * Tableau de bord dense.
	 *
	 * Tout ce qui compte tient sans faire defiler : un bandeau de compteurs, puis
	 * des listes serrees cote a cote. Le parti pris vient de l'usage — on ouvre
	 * cet ecran vingt fois par jour pour savoir ou en est le site, pas pour lire.
	 * Les explications sont donc parties ; ce qui reste, ce sont des lignes qui
	 * menent quelque part.
	 *
	 * Chaque carte reste conditionnee a sa permission : une carte vide vaut mieux
	 * qu'une carte absente, mais une carte qu'on n'a pas le droit d'ouvrir ne
	 * doit pas exister.
	 */
	const work = $derived(buildWorklist(data.work, data.user));
	const urgent = $derived(work.filter((item) => item.tone === 'urgent').length);

	const published = $derived(
		data.surveyStatuses.find((row) => row.status === 'PUBLISHED')?.count ?? 0
	);
	const rejectedRows = $derived(data.syncs.reduce((total, row) => total + row.rejected, 0));

	const counters = $derived.by(() => {
		const list: Counter[] = [];

		if (can(data.user, 'survey.read')) {
			list.push({
				label: 'Sondages',
				total: data.surveys,
				href: '/admin/sondages'
			});
			list.push({
				label: 'Réponses',
				total: data.responses.total,
				current: data.responses.current,
				previous: data.responses.previous
			});
		}

		if (can(data.user, 'media.read')) {
			list.push({
				label: 'Médiathèque',
				total: data.media.total,
				current: data.media.current,
				previous: data.media.previous,
				href: '/admin/medias'
			});
		}

		if (can(data.user, 'newsletter.read')) {
			list.push({
				label: 'Abonnés',
				total: data.subscribers.total,
				current: data.subscribers.current,
				previous: data.subscribers.previous,
				href: '/admin/infolettre'
			});
		}

		return list;
	});

	const ROW = 'flex items-baseline justify-between gap-3 px-4 py-2 text-sm';
</script>

<svelte:head><title>Back-office, Humanitour</title></svelte:head>

<PageHeader
	title="Bonjour {data.user.displayName}"
	description="{data.user.role.name} · {formatCount(published)} sondage{published > 1
		? 's'
		: ''} publié{published > 1 ? 's' : ''} sur le site"
/>

{#if counters.length > 0}
	<CounterStrip {counters} />
{/if}

<div class="grid gap-5 lg:grid-cols-2">
	<ListPanel
		title="À faire"
		badge={urgent > 0 ? `${urgent} en retard` : undefined}
		rows={work.length}
		empty="Aucun brouillon en souffrance, aucune publication en retard, aucune synchronisation tombée."
	>
		{#each work as item (item.key)}
			<li>
				<a href={item.href} class="hover:bg-cream flex items-baseline gap-2.5 px-4 py-2 text-sm">
					<!-- Le point est decoratif et le dit : ce qui distingue une urgence
					     d'une tache, c'est la mention « en retard » de l'entete et l'ordre
					     de la liste, jamais la pastille seule. -->
					<span
						aria-hidden="true"
						class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full {item.tone === 'urgent'
							? 'bg-danger'
							: 'bg-ink/30'}"
					></span>
					<span class="min-w-0 flex-1">
						<span class="font-medium underline decoration-2 underline-offset-2">{item.label}</span>
						<span class="text-muted block text-xs">{item.detail}</span>
					</span>
				</a>
			</li>
		{/each}
	</ListPanel>

	{#if can(data.user, 'audit.read')}
		<ListPanel
			title="Dernières actions"
			rows={data.recentAudit.length}
			empty="Aucune action journalisée."
			href="/admin/journal"
			linkLabel="Ouvrir le journal"
		>
			{#each data.recentAudit as event (event.id)}
				<li class={ROW}>
					<span class="min-w-0">
						<code class="bg-cream rounded px-1.5 py-0.5 text-xs">{event.action}</code>
						<span class="text-muted ml-1.5 text-xs">{event.entity}</span>
					</span>
					<span class="text-muted shrink-0 text-xs">
						{event.actor?.displayName ?? 'Système'}, {formatDate(event.createdAt)}
					</span>
				</li>
			{/each}
		</ListPanel>
	{/if}

	{#if can(data.user, 'survey.read')}
		<ListPanel
			title="Synchronisation Openforms"
			badge={rejectedRows > 0 ? `${formatCount(rejectedRows)} rejetée${rejectedRows > 1 ? 's' : ''}` : undefined}
			rows={data.syncs.length}
			empty="Aucune passe enregistrée."
		>
			{#each data.syncs as pass (pass.status)}
				<li class={ROW}>
					<StatusBadge status={pass.status} />
					<span class="tabular text-muted text-xs">
						{formatCount(pass.passes)} passe{pass.passes > 1 ? 's' : ''}, {formatCount(
							pass.created
						)} reprise{pass.created > 1 ? 's' : ''}{#if pass.rejected > 0}, {formatCount(
								pass.rejected
							)} rejetée{pass.rejected > 1 ? 's' : ''}{/if}
					</span>
				</li>
			{/each}
		</ListPanel>
	{/if}

	{#if can(data.user, 'audit.read')}
		<ListPanel
			title="Équipe, 30 jours"
			rows={data.team.length}
			empty="Aucune action journalisée sur la période."
		>
			{#each data.team as member (member.actor)}
				<li class={ROW}>
					<span class="font-medium">{member.actor}</span>
					<span class="tabular text-muted">{formatCount(member.actions)}</span>
				</li>
			{/each}
		</ListPanel>
	{/if}
</div>
