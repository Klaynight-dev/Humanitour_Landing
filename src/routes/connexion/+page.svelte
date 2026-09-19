<script lang="ts">
	import { enhance } from '$app/forms';
	import { SITE } from '$lib/shared/site';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const field =
		'border-ink/20 rounded-field bg-paper min-h-11 border px-3 py-2.5 focus-visible:border-ink';
</script>

<svelte:head>
	<title>Connexion, {SITE.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto flex max-w-md flex-col justify-center px-4 py-20 sm:px-6">
	<div class="surface-brand rounded-panel mb-8 h-12 w-12" aria-hidden="true"></div>

	<h1 class="font-sans text-3xl font-bold tracking-tight">Connexion</h1>
	<p class="text-muted mt-2">
		Réservé à l'équipe. Les comptes sont créés par invitation, il n'y a pas d'inscription.
	</p>

	<form method="POST" use:enhance class="mt-8 flex flex-col gap-5">
		{#if data.suite}
			<input type="hidden" name="suite" value={data.suite} />
		{/if}

		{#if form?.message}
			<!-- L erreur est portee par le texte, pas par la seule couleur : elle se
			     lit en niveaux de gris comme pour une personne daltonienne. -->
			<p role="alert" class="border-danger/40 bg-danger/10 text-danger rounded-field border px-4 py-3">
				<strong class="font-semibold">Connexion refusée.</strong>
				{form.message}
			</p>
		{/if}

		<label class="flex flex-col gap-1.5">
			<span class="font-semibold">Adresse électronique</span>
			<input
				type="email"
				name="email"
				required
				autocomplete="username"
				value={form?.email ?? ''}
				class={field}
			/>
		</label>

		<label class="flex flex-col gap-1.5">
			<span class="font-semibold">Mot de passe</span>
			<input
				type="password"
				name="password"
				required
				autocomplete="current-password"
				class={field}
			/>
		</label>

		<button
			type="submit"
			class="bg-ink text-paper press rounded-pill mt-1 min-h-12 px-5 py-3 font-semibold"
		>
			Se connecter
		</button>
	</form>

	<p class="text-muted mt-8 text-sm">
		<a href="/" class="underline decoration-2 underline-offset-2">Retour au site</a>
	</p>
</div>
