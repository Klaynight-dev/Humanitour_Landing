<script lang="ts">
	import { enhance } from '$app/forms';
	import { SITE } from '$lib/shared/site';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const field =
		'border-ink/20 rounded-field bg-paper min-h-11 border px-3 py-2.5 focus-visible:border-ink';
</script>

<svelte:head>
	<title>Rejoindre l'équipe, {SITE.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto flex max-w-md flex-col justify-center px-4 py-20 sm:px-6">
	<div class="surface-brand rounded-panel mb-8 h-12 w-12" aria-hidden="true"></div>

	<h1 class="font-sans text-3xl font-bold tracking-tight">Rejoindre l'équipe</h1>
	<p class="text-muted mt-2">
		Vous avez été invité comme <strong>{data.roleName}</strong> avec l'adresse
		<strong>{data.email}</strong>.
	</p>

	<form method="POST" use:enhance class="mt-8 flex flex-col gap-5">
		{#if form?.message}
			<p role="alert" class="border-danger/40 bg-danger/10 text-danger rounded-field border px-4 py-3">
				<strong class="font-semibold">Compte non créé.</strong>
				{form.message}
			</p>
		{/if}

		<label class="flex flex-col gap-1.5">
			<span class="font-semibold">Votre nom</span>
			<span class="text-muted text-sm">
				Affiché comme signature sur les articles que vous publiez.
			</span>
			<input name="displayName" required minlength="2" autocomplete="name" class={field} />
		</label>

		<label class="flex flex-col gap-1.5">
			<span class="font-semibold">Mot de passe</span>
			<span class="text-muted text-sm">
				Douze caractères minimum. Une phrase entière vaut mieux qu'un mot compliqué.
			</span>
			<input
				type="password"
				name="password"
				required
				minlength="12"
				autocomplete="new-password"
				class={field}
			/>
		</label>

		<label class="flex flex-col gap-1.5">
			<span class="font-semibold">Confirmation</span>
			<input
				type="password"
				name="passwordConfirm"
				required
				minlength="12"
				autocomplete="new-password"
				class={field}
			/>
		</label>

		<button
			type="submit"
			class="bg-ink text-paper press rounded-pill mt-1 min-h-12 px-5 py-3 font-semibold"
		>
			Créer mon compte
		</button>
	</form>
</div>
