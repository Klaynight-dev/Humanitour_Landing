<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import PageHeader from '$components/admin/PageHeader.svelte';
	import { formatDate } from '$lib/shared/format';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const base = $derived(`/admin/sondages/${data.survey.id}/redressement`);

	/*
	 * L ordre des onglets est l ordre du travail : on regarde l echantillon, on
	 * fixe les marges, on calcule, on juge la qualite, on publie la note. Le
	 * numero est dans le libelle parce que c est une sequence, pas un menu.
	 */
	const tabs = $derived([
		{ href: base, label: '1. Échantillon' },
		{ href: `${base}/marges`, label: '2. Marges et cibles' },
		{ href: `${base}/calcul`, label: '3. Calcul' },
		{ href: `${base}/qualite`, label: '4. Qualité' },
		{ href: `${base}/rapport`, label: '5. Rapport et export' }
	]);

	const latest = $derived(data.state);
</script>

<svelte:head><title>Redressement, {data.survey.title} | Back-office</title></svelte:head>

<PageHeader
	title="Redressement"
	breadcrumb={[
		{ label: 'Sondages', href: '/admin/sondages' },
		{ label: data.survey.title, href: `/admin/sondages/${data.survey.id}` }
	]}
	description="Calage sur marges (Deville et Särndal, méthode raking ratio) : chaque répondant reçoit un poids pour que l'échantillon rejoigne les parts de la population. La lecture brute reste celle affichée par défaut sur le site public."
/>

<p class="text-muted -mt-4 mb-5 text-sm" role="status">
	{#if !latest}
		Aucun calcul pour l'instant.
	{:else}
		Version {latest.version}, calculée le {formatDate(latest.computedAt)}{latest.computedBy
			? ` par ${latest.computedBy}`
			: ''}.
		{latest.isPublished ? 'Publiée à côté de la lecture brute.' : 'Non publiée.'}
		{#if latest.marginsChanged}
			<strong class="text-danger font-semibold">Les marges ont changé depuis ce calcul.</strong>
		{/if}
		{#if latest.unweighted > 0}
			<strong class="text-danger font-semibold"
				>{latest.unweighted} réponse{latest.unweighted > 1 ? 's' : ''} sans poids.</strong
			>
		{/if}
	{/if}
</p>

<!--
	Des liens, pas des boutons : chaque onglet est une page, et la barre defile
	a l horizontale sur un telephone plutot que de passer sur deux lignes.
-->
<nav aria-label="Étapes du redressement" class="border-ink/12 mb-6 overflow-x-auto border-b">
	<ul class="flex min-w-max gap-1">
		{#each tabs as tab (tab.href)}
			{@const current = page.url.pathname === tab.href}
			<li>
				<a
					href={tab.href}
					aria-current={current ? 'page' : undefined}
					class="press -mb-px inline-flex min-h-11 items-center border-b-2 px-4 text-sm font-medium whitespace-nowrap {current
						? 'border-ink text-ink'
						: 'text-muted hover:text-ink border-transparent'}"
				>
					{tab.label}
				</a>
			</li>
		{/each}
	</ul>
</nav>

{@render children()}
