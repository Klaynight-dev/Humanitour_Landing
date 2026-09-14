<script lang="ts">
	import { enhance } from '$app/forms';
	import { SITE } from '$lib/shared/site';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Rejoindre l'equipe — {SITE.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto flex max-w-md flex-col justify-center px-4 py-20 sm:px-6">
	<div class="surface-mesh mb-8 h-12 w-12 rounded-xl" aria-hidden="true"></div>

	<h1 class="font-display text-3xl font-semibold">Rejoindre l'equipe</h1>
	<p class="text-muted mt-2 text-sm">
		Vous avez ete invite comme <strong>{data.roleName}</strong> avec l'adresse
		<strong>{data.email}</strong>.
	</p>

	<form method="POST" use:enhance class="mt-8 flex flex-col gap-4">
		{#if form?.message}
			<p
				role="alert"
				class="border-ink text-danger bg-paper brut-sm rounded-lg border-2 px-4 py-3 text-sm"
			>
				{form.message}
			</p>
		{/if}

		<label class="flex flex-col gap-1.5">
			<span class="text-sm font-semibold">Votre nom</span>
			<span class="text-muted text-xs">Affiche comme signature sur les articles que vous publiez.</span>
			<input
				name="displayName"
				required
				minlength="2"
				autocomplete="name"
				class="border-ink bg-paper rounded-lg border-2 px-3 py-2.5"
			/>
		</label>

		<label class="flex flex-col gap-1.5">
			<span class="text-sm font-semibold">Mot de passe</span>
			<span class="text-muted text-xs">
				Douze caracteres minimum. Une phrase entiere vaut mieux qu'un mot complique.
			</span>
			<input
				type="password"
				name="password"
				required
				minlength="12"
				autocomplete="new-password"
				class="border-ink bg-paper rounded-lg border-2 px-3 py-2.5"
			/>
		</label>

		<label class="flex flex-col gap-1.5">
			<span class="text-sm font-semibold">Confirmation</span>
			<input
				type="password"
				name="passwordConfirm"
				required
				minlength="12"
				autocomplete="new-password"
				class="border-ink bg-paper rounded-lg border-2 px-3 py-2.5"
			/>
		</label>

		<button
			type="submit"
			class="bg-ink text-white brut brut-press rounded-pill mt-2 px-5 py-3 font-bold"
		>
			Creer mon compte
		</button>
	</form>
</div>
