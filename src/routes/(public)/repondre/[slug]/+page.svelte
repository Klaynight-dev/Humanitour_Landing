<script lang="ts">
	import Button from '$components/Button.svelte';
	import Field from '$components/openforms/Field.svelte';
	import { blankValues, visibleFields } from '$shared/openforms/submission';
	import type { FieldValue } from '$shared/openforms/types';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	/**
	 * L'etat du questionnaire.
	 *
	 * Reprend ce que le serveur a renvoye apres un refus : sans cela, une erreur
	 * sur une seule question viderait tout le formulaire, et personne ne le
	 * remplirait deux fois.
	 *
	 * Lire `form` et `data` a l'initialisation est CORRECT ici, contrairement au
	 * cas general que Svelte signale : le formulaire est envoye sans
	 * `use:enhance`, donc chaque envoi est une navigation complete et le
	 * composant est reconstruit avec la reponse du serveur. Il n'y a pas de mise
	 * a jour de `form` a suivre sur un composant deja monte.
	 */
	// svelte-ignore state_referenced_locally
	let values = $state<Record<string, FieldValue>>({
		...blankValues(data.fields),
		...((form?.values ?? {}) as Record<string, FieldValue>)
	});

	// Les champs conditionnels apparaissent au fil des reponses. Sans
	// JavaScript, ils sont tous affiches : le serveur ne valide de toute facon
	// que ceux dont la condition est remplie.
	const shown = $derived(visibleFields(data.fields, values));

	const errors = $derived((form?.errors ?? {}) as Record<string, string>);
</script>

<svelte:head>
	<title>{data.survey.title} — Répondre, Humanitour</title>
	<!--
		Un questionnaire ouvert n'a pas a etre indexe : c'est la page de resultats
		qui merite d'etre trouvee, et un formulaire en tete de recherche attirerait
		des reponses hors du protocole d'echantillonnage.
	-->
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="bg-cream">
	<div class="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
		<header>
			<p class="text-muted text-sm font-semibold tracking-wide uppercase">Enquête en cours</p>
			<h1 class="enter mt-3 text-4xl sm:text-5xl">{data.survey.title}</h1>
			{#if data.survey.subtitle}
				<p class="measure enter mt-4 text-lg leading-relaxed" style="--enter-delay: 90ms">
					{data.survey.subtitle}
				</p>
			{/if}
		</header>

		{#if !data.servable}
			<!--
				Le questionnaire porte un champ que ce site ne collecte pas (une donnee
				identifiante obligatoire, le plus souvent). On le dit, et on renvoie la
				ou il se remplit entierement.
			-->
			<div class="border-ink/20 rounded-panel bg-paper mt-10 border p-8">
				<p class="text-lg font-semibold">Ce questionnaire se remplit sur notre outil d'enquête.</p>
				<p class="measure text-muted mt-3">
					Il comporte des champs que ce site ne recueille pas, pour ne pas mêler des données
					personnelles à des opinions politiques. Il reste accessible en entier sur
					forms.humanitour.fr.
				</p>
				<div class="mt-6">
					<Button href={data.remoteUrl} variant="brand" external>Ouvrir le questionnaire</Button>
				</div>
			</div>
		{:else}
			{#if data.form.description}
				<p class="measure mt-8 leading-relaxed">{data.form.description}</p>
			{/if}

			{#if form?.message}
				<!--
					role="alert" : apres un envoi refuse, le message doit etre annonce
					sans que le lecteur d'ecran ait a repartir en haut de page.
				-->
				<p
					role="alert"
					class="border-ink rounded-field bg-paper mt-8 border-2 px-4 py-3 font-semibold"
				>
					{form.message}
				</p>
			{/if}

			<!--
				Formulaire HTML ordinaire, sans `use:enhance` : il fonctionne
				identiquement avec et sans JavaScript, et une reponse a une enquete
				n'a pas besoin d'etre envoyee sans rechargement. Ce qui compte est
				qu'elle parte.
			-->
			<form method="POST" class="mt-10 flex flex-col gap-8">
				{#each shown as field (field.key)}
					<Field {field} bind:value={values[field.key]} error={errors[field.key]} />
				{/each}

				{#if data.form.requireConsent}
					<label
						class="border-ink/20 bg-paper rounded-field flex cursor-pointer items-start gap-3 border p-4"
					>
						<input
							type="checkbox"
							name="consentement"
							required
							class="accent-ink mt-1 size-4 shrink-0"
						/>
						<span class="text-sm leading-relaxed">
							{data.form.consentText ??
								'J’accepte que mes réponses soient enregistrées et publiées de manière anonyme, sous licence ODbL.'}
							{#if data.form.privacyPolicyUrl}
								<a
									href={data.form.privacyPolicyUrl}
									class="underline decoration-2 underline-offset-4"
								>
									Politique de confidentialité
								</a>
							{/if}
						</span>
					</label>
				{/if}

				<div class="flex flex-wrap items-center gap-4">
					<Button type="submit" variant="brand" size="lg">Envoyer ma réponse</Button>
					<p class="text-muted text-sm">
						Aucune adresse, aucun nom, aucun compte. Vos réponses rejoignent les données brutes
						publiées.
					</p>
				</div>
			</form>
		{/if}
	</div>
</div>
