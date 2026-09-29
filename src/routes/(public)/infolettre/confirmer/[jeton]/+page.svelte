<script lang="ts">
	import { enhance } from '$app/forms';
	import { SITE } from '$lib/shared/site';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let submitting = $state(false);
</script>

<svelte:head>
	<title>Confirmer l'inscription, {SITE.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="bg-cream">
	<div class="mx-auto max-w-2xl px-4 py-20 sm:px-6 sm:py-28">
		{#if data.state === 'confirmed'}
			<h1>C'est confirmé</h1>
			<p class="mt-6 text-lg leading-relaxed">
				Vous recevrez l'infolettre d'Humanitour à la publication des résultats et de la série
				documentaire. Chaque envoi porte un lien pour vous désinscrire en un clic.
			</p>
			<p class="mt-8">
				<a href="/donnees" class="font-semibold underline decoration-2 underline-offset-4">
					Voir les données déjà publiées
				</a>
			</p>
		{:else if data.state === 'pending'}
			<h1>Confirmer l'inscription</h1>
			<p class="mt-6 text-lg leading-relaxed">
				Vous allez recevoir l'infolettre d'Humanitour à l'adresse
				<strong class="font-semibold break-all">{data.email}</strong>.
			</p>
			<form
				method="POST"
				use:enhance={() => {
					submitting = true;
					return async ({ update }) => {
						await update();
						submitting = false;
					};
				}}
				class="mt-8"
			>
				<button
					type="submit"
					disabled={submitting}
					class="bg-ink text-paper press rounded-pill min-h-12 px-6 py-3 font-semibold disabled:opacity-60"
				>
					{submitting ? 'Confirmation…' : 'Confirmer mon inscription'}
				</button>
			</form>
			<p class="text-ink-soft mt-8 text-base leading-relaxed">
				Vous n'avez rien demandé ? Fermez cette page : sans confirmation, l'adresse ne reçoit rien
				et sera effacée.
			</p>
		{:else}
			<h1>Lien inutilisable</h1>
			<p class="mt-6 text-lg leading-relaxed">
				Ce lien a déjà servi, ou il a été remplacé par un envoi plus récent. Si vous avez déjà
				confirmé, il n'y a rien d'autre à faire.
			</p>
			<p class="mt-8">
				<a href="/infolettre" class="font-semibold underline decoration-2 underline-offset-4">
					Recommencer l'inscription
				</a>
			</p>
		{/if}
	</div>
</div>
