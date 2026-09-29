<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '$components/admin/PageHeader.svelte';
	import StatusBadge from '$components/admin/StatusBadge.svelte';
	import Table from '$components/admin/Table.svelte';
	import { formatCount, formatDate } from '$lib/shared/format';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Campagnes, back-office</title></svelte:head>

<PageHeader
	title="Campagnes"
	breadcrumb={[{ label: 'Infolettre', href: '/admin/infolettre' }]}
	description="Ce que reçoivent les adresses confirmées. Une campagne diffusée ne se rattrape pas : envoyez-vous d'abord un essai."
>
	{#snippet actions()}
		{#if data.writable}
			<form method="POST" action="?/create" use:enhance>
				<button
					type="submit"
					class="bg-ink text-paper press rounded-pill inline-flex min-h-11 items-center px-4 py-2 text-sm font-semibold"
				>
					Rédiger une campagne
				</button>
			</form>
		{/if}
	{/snippet}
</PageHeader>

<Table
	empty={data.campaigns.length === 0}
	emptyTitle="Aucune campagne pour l'instant"
	emptyDescription={data.writable
		? 'La première campagne s’écrit en Markdown, avec un aperçu du courriel tel qu’il arrivera.'
		: 'Les campagnes rédigées par l’équipe apparaîtront ici.'}
	minWidth="44rem"
>
	{#snippet head()}
		<th scope="col" class="px-4 py-3 font-semibold">Objet</th>
		<th scope="col" class="px-4 py-3 font-semibold">État</th>
		<th scope="col" class="px-4 py-3 font-semibold">Date</th>
		<th scope="col" class="px-4 py-3 text-right font-semibold">Destinataires</th>
		<th scope="col" class="px-4 py-3 text-right font-semibold">Remis</th>
		<th scope="col" class="px-4 py-3 text-right font-semibold">Rejetés ou signalés</th>
	{/snippet}

	{#snippet body()}
		{#each data.campaigns as campaign (campaign.id)}
			<tr class="border-ink/10 border-b last:border-0">
				<td class="px-4 py-3">
					<a
						href="/admin/infolettre/campagnes/{campaign.id}"
						class="font-semibold underline decoration-2 underline-offset-2"
					>
						{campaign.subject}
					</a>
				</td>
				<td class="px-4 py-3"><StatusBadge status={campaign.status} /></td>
				<td class="text-muted px-4 py-3">
					{formatDate(campaign.sentAt ?? campaign.updatedAt)}
				</td>
				<td class="px-4 py-3 text-right font-mono">
					{campaign.status === 'DRAFT' ? '–' : formatCount(campaign.recipientCount)}
				</td>
				<td class="px-4 py-3 text-right font-mono">
					{campaign.status === 'DRAFT' ? '–' : formatCount(campaign.deliveredCount)}
				</td>
				<td class="px-4 py-3 text-right font-mono">
					{campaign.status === 'DRAFT'
						? '–'
						: formatCount(campaign.bouncedCount + campaign.complainedCount)}
				</td>
			</tr>
		{/each}
	{/snippet}
</Table>
