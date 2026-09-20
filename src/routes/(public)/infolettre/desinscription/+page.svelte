<script lang="ts">
	import { enhance } from '$app/forms';
	import { SITE } from '$lib/shared/site';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const field =
		'border-ink/20 rounded-field bg-paper min-h-11 border px-3 py-2.5 focus-visible:border-ink';
</script>

<svelte:head>
	<title>Se désinscrire de l'infolettre, {SITE.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="bg-cream">
	<div class="mx-auto max-w-2xl px-4 py-20 sm:px-6 sm:py-28">
		<h1>Se désinscrire</h1>

		{#if data.done}
			<p class="border-ink/20 bg-paper rounded-panel mt-8 border px-5 py-4 text-lg leading-relaxed">
				<strong class="font-semibold">C'est fait.</strong>
				Si cette adresse était inscrite, elle ne l'est plus et a été effacée de la base.
			</p>
		{:else}
			<p class="text-ink-soft mt-4 text-lg leading-relaxed">
				Saisissez l'adresse à retirer. Elle est effacée de la base, pas désactivée.
			</p>

			<form method="POST" use:enhance class="mt-10 flex flex-col gap-5">
				{#if form?.message}
					<p
						role="alert"
						class="border-danger/40 bg-danger/10 text-danger rounded-field border px-4 py-3"
					>
						<strong class="font-semibold">Demande refusée.</strong>
						{form.message}
					</p>
				{/if}

				<label class="flex flex-col gap-1.5">
					<span class="font-semibold">Adresse électronique</span>
					<input
						type="email"
						name="email"
						required
						autocomplete="email"
						maxlength="254"
						value={form?.email ?? ''}
						class={field}
					/>
				</label>

				<button
					type="submit"
					class="bg-ink text-paper press rounded-pill mt-1 min-h-12 self-start px-6 py-3 font-semibold"
				>
					Me désinscrire
				</button>
			</form>
		{/if}

		<p class="text-ink-soft mt-14 text-sm leading-relaxed">
			La réponse est la même que l'adresse ait été trouvée ou non : une réponse différente
			révélerait qui est dans la liste. Une question ?
			<a href="mailto:{SITE.email}" class="underline decoration-2 underline-offset-2">
				{SITE.email}
			</a>
		</p>
	</div>
</div>
