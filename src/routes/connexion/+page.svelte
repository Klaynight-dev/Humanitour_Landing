<script lang="ts">
	import { enhance } from '$app/forms';
	import { SITE } from '$lib/shared/site';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Connexion — {SITE.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto flex max-w-md flex-col justify-center px-4 py-20 sm:px-6">
	<div class="surface-mesh mb-8 h-12 w-12 rounded-xl" aria-hidden="true"></div>

	<h1 class="font-display text-3xl font-semibold">Connexion</h1>
	<p class="text-muted mt-2 text-sm">
		Reserve a l'equipe. Les comptes sont crees par invitation, il n'y a pas d'inscription.
	</p>

	<form method="POST" use:enhance class="mt-8 flex flex-col gap-4">
		{#if data.suite}
			<input type="hidden" name="suite" value={data.suite} />
		{/if}

		{#if form?.message}
			<p
				role="alert"
				class="border-ink text-danger bg-paper brut-sm rounded-lg border-2 px-4 py-3 text-sm"
			>
				{form.message}
			</p>
		{/if}

		<label class="flex flex-col gap-1.5">
			<span class="text-sm font-semibold">Adresse electronique</span>
			<input
				type="email"
				name="email"
				required
				autocomplete="username"
				value={form?.email ?? ''}
				class="border-ink bg-paper rounded-lg border-2 px-3 py-2.5"
			/>
		</label>

		<label class="flex flex-col gap-1.5">
			<span class="text-sm font-semibold">Mot de passe</span>
			<input
				type="password"
				name="password"
				required
				autocomplete="current-password"
				class="border-ink bg-paper rounded-lg border-2 px-3 py-2.5"
			/>
		</label>

		<button
			type="submit"
			class="bg-ink text-white brut brut-press rounded-pill mt-2 px-5 py-3 font-bold"
		>
			Se connecter
		</button>
	</form>

	<p class="text-muted mt-8 text-xs">
		<a href="/" class="underline">Retour au site</a>
	</p>
</div>
