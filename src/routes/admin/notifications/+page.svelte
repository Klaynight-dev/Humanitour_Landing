<script lang="ts">
	import { enhance } from '$app/forms';
	import EmptyState from '$components/admin/EmptyState.svelte';
	import Flash from '$components/admin/Flash.svelte';
	import PageHeader from '$components/admin/PageHeader.svelte';
	import Panel from '$components/admin/Panel.svelte';
	import { formatDate } from '$lib/shared/format';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head><title>Notifications, back-office</title></svelte:head>

<PageHeader
	title="Notifications"
	description="Ce qui a été publié, importé ou mis en ligne par l'équipe. Vous ne voyez que ce que vos permissions vous laissent déjà consulter."
>
	{#snippet actions()}
		{#if data.notifications.some((notification) => notification.unread)}
			<form method="POST" action="?/markAllRead" use:enhance>
				<button
					type="submit"
					class="border-ink/25 press bg-paper rounded-pill inline-flex min-h-11 items-center justify-center border px-4 py-2 text-sm font-medium"
				>
					Tout marquer comme lu
				</button>
			</form>
		{/if}
	{/snippet}
</PageHeader>

<Flash message={form?.message} />

{#if data.notifications.length === 0}
	<EmptyState
		title="Rien à signaler"
		description="Les publications, imports et mises en ligne de l'équipe apparaîtront ici."
	/>
{:else}
	<Panel>
		<ul class="flex flex-col">
			{#each data.notifications as notification (notification.id)}
				<li class="border-ink/12 border-b last:border-0">
					<a
						href={notification.href}
						class="hover:bg-cream flex flex-wrap items-baseline justify-between gap-3 px-2 py-3"
					>
						<span class="min-w-0">
							<span class="flex items-center gap-2">
								{#if notification.unread}
									<span class="bg-coral h-2 w-2 shrink-0 rounded-full" aria-hidden="true"></span>
									<span class="sr-only">Non lue.</span>
								{/if}
								<span class="font-semibold">{notification.title}</span>
							</span>
							<span class="text-muted mt-0.5 block text-sm">{notification.description}</span>
						</span>
						<span class="text-muted shrink-0 text-xs">
							{#if notification.actor}{notification.actor}, {/if}{formatDate(notification.createdAt)}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	</Panel>
{/if}
