<script lang="ts">
	import { enhance } from '$app/forms';
	import { SITE } from '$lib/shared/site';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const field =
		'border-ink/20 rounded-field bg-paper min-h-11 border px-3 py-2.5 focus-visible:border-ink';
</script>

<svelte:head>
	<title>L'infolettre, {SITE.name}</title>
	<meta
		name="description"
		content="Être prévenu·e de la publication des résultats et de la série documentaire d'Humanitour."
	/>
</svelte:head>

<div class="bg-cream">
	<div class="mx-auto max-w-2xl px-4 py-20 sm:px-6 sm:py-28">
		<h1>L'infolettre</h1>

		{#if data.subscribed}
			<!-- Apres une inscription, la page revient en GET : un rafraichissement
			     ne repose pas l'adresse. -->
			<p class="border-ink/20 bg-paper rounded-panel mt-8 border px-5 py-4 text-lg leading-relaxed">
				<strong class="font-semibold">C'est noté.</strong>
				Votre adresse est enregistrée. Vous recevrez un message quand les résultats et la série documentaire
				seront publiés, et rien d'autre.
			</p>
		{:else}
			<p class="text-ink-soft mt-4 text-lg leading-relaxed">
				Les résultats de l'enquête et la série documentaire seront publiés ici. Laissez votre
				adresse pour être prévenu·e : nous n'écrivons que lorsqu'il y a quelque chose à lire.
			</p>

			<form method="POST" use:enhance class="mt-10 flex flex-col gap-5">
				{#if form?.message}
					<!-- L'erreur est portee par le texte, pas par la seule couleur. -->
					<p
						role="alert"
						class="border-danger/40 bg-danger/10 text-danger rounded-field border px-4 py-3"
					>
						<strong class="font-semibold">Inscription refusée.</strong>
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

				<!-- Decochee par defaut, et l'action refuse sans elle : une case
				     pre-cochee n'est pas un consentement. -->
				<label class="flex items-start gap-3">
					<input
						type="checkbox"
						name="consentement"
						required
						class="accent-ink mt-1 size-5 shrink-0"
					/>
					<span class="text-base leading-relaxed">
						J'accepte de recevoir l'infolettre d'Humanitour à cette adresse, et je sais que je peux
						me désinscrire à tout moment.
					</span>
				</label>

				<button
					type="submit"
					class="bg-ink text-paper press rounded-pill mt-1 min-h-12 self-start px-6 py-3 font-semibold"
				>
					S'abonner
				</button>
			</form>
		{/if}

		<!--
			L'information de l'article 13 du RGPD se donne AU MOMENT de la collecte,
			pas seulement dans une politique de confidentialite qu'on ouvre rarement.
			Elle reste donc sur cette page, sous le formulaire.
		-->
		<div class="border-ink/15 mt-14 border-t pt-8">
			<h2 class="text-xl">Ce que devient votre adresse</h2>
			<ul class="text-ink-soft mt-4 flex list-disc flex-col gap-2 pl-5 leading-relaxed">
				<li>
					Elle est conservée par l'association Humanitour, dans sa propre base, hébergée en France.
				</li>
				<li>
					Elle sert uniquement à vous annoncer la publication des résultats et de la série
					documentaire. Elle n'est ni vendue, ni cédée, ni confiée à un tiers.
				</li>
				<li>
					Elle n'est rapprochée d'aucune réponse au sondage. Les réponses ne portent aucune
					identité, ce rapprochement est donc impossible, et pas seulement interdit.
				</li>
				<li>Elle est conservée jusqu'à votre désinscription, puis effacée.</li>
				<li>
					Pour accéder à vos données, les corriger ou les faire effacer :
					<a href="mailto:{SITE.email}" class="underline decoration-2 underline-offset-2">
						{SITE.email}
					</a>.
				</li>
			</ul>

			<p class="mt-6">
				<a
					href="/infolettre/desinscription"
					class="font-semibold underline decoration-2 underline-offset-4"
				>
					Se désinscrire
				</a>
			</p>
		</div>
	</div>
</div>
