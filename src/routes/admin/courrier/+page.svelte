<script lang="ts">
	import EmptyState from '$components/admin/EmptyState.svelte';
	import PageHeader from '$components/admin/PageHeader.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Courrier, back-office</title></svelte:head>

<PageHeader title="Courrier" />

<EmptyState
	title="Aucune boîte ne vous est attribuée"
	description={data.canManage
		? 'Créez votre boîte personnelle, ou ajoutez-vous aux membres d’une boîte partagée comme contact@, depuis la gestion des boîtes.'
		: 'Une personne qui gère les boîtes peut vous créer une boîte personnelle ou vous ajouter aux membres de contact@.'}
>
	{#snippet action()}
		{#if data.canManage}
			<a
				href="/admin/courrier/boites"
				class="bg-ink text-paper press rounded-pill inline-flex min-h-11 items-center px-4 py-2 text-sm font-semibold"
			>
				Gérer les boîtes
			</a>
		{/if}
	{/snippet}
</EmptyState>
