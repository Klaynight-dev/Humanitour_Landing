<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { closeAfter } from '$components/admin/enhance';
	import Dialog from '$components/admin/Dialog.svelte';
	import Flash from '$components/admin/Flash.svelte';
	import PageHeader from '$components/admin/PageHeader.svelte';
	import Panel from '$components/admin/Panel.svelte';
	import StatusBadge from '$components/admin/StatusBadge.svelte';
	import { formatCount, formatDate } from '$lib/shared/format';
	import { brandedEmail } from '$lib/shared/mail/layout';
	import { CAMPAIGN_REASON } from '$lib/shared/newsletter';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const draft = $derived(data.campaign.status === 'DRAFT');
	const editable = $derived(draft && data.writable);

	// Etat local du formulaire, pour l'apercu en direct. Il repart des donnees
	// du serveur a chaque rechargement (apres un enregistrement, une diffusion).
	let subject = $state('');
	let preheader = $state('');
	let markdown = $state('');
	$effect.pre(() => {
		subject = data.campaign.subject;
		preheader = data.campaign.preheader ?? '';
		markdown = data.campaign.markdown;
	});

	let width: 'desktop' | 'mobile' = $state('desktop');
	let confirmingSend = $state(false);
	let confirmingDelete = $state(false);
	let busy: string | null = $state(null);

	/**
	 * L'apercu rend exactement le HTML qui partira : meme fonction, meme
	 * gabarit. Seul le lien de desinscription est generique, puisqu'il porte
	 * l'adresse signee de chaque destinataire.
	 */
	const preview = $derived(
		brandedEmail({
			subject,
			preheader: preheader || undefined,
			markdown: markdown || '*Le texte de la campagne apparaîtra ici.*',
			reason: CAMPAIGN_REASON,
			unsubscribeUrl: `${data.origin}/infolettre/desinscription`,
			origin: data.origin
		}).html
	);

	// Pendant la diffusion, la page se relit toutes les trois secondes pour
	// suivre la progression. Rien ne tourne une fois la campagne envoyee.
	$effect(() => {
		if (data.campaign.status !== 'SENDING' || !data.running) return;
		const timer = setInterval(() => invalidateAll(), 3000);
		return () => clearInterval(timer);
	});

	const progress = $derived(
		data.campaign.recipientCount === 0
			? 0
			: Math.min(
					1,
					(data.campaign.sentCount + data.campaign.failedCount) / data.campaign.recipientCount
				)
	);

	/**
	 * Suit l'action en cours pour griser les boutons et nommer l'attente. Le
	 * formulaire de redaction porte trois boutons : c'est celui qui a soumis
	 * qui dit laquelle.
	 */
	const track: SubmitFunction = ({ submitter, action }) => {
		busy = submitter?.getAttribute('formaction')?.slice(2) ?? action.search.slice(2);
		return async ({ update }) => {
			await update();
			busy = null;
		};
	};

	const field = 'border-ink/20 bg-paper rounded-field min-h-11 border px-3 py-2 text-sm';
	const secondary =
		'border-ink/25 bg-paper press rounded-pill inline-flex min-h-11 items-center justify-center border px-4 py-2 text-sm font-medium disabled:opacity-60';
</script>

<svelte:head><title>{data.campaign.subject}, back-office</title></svelte:head>

<PageHeader
	title={data.campaign.subject}
	breadcrumb={[
		{ label: 'Infolettre', href: '/admin/infolettre' },
		{ label: 'Campagnes', href: '/admin/infolettre/campagnes' }
	]}
	description={data.campaign.createdBy
		? `Rédigée par ${data.campaign.createdBy.displayName}.`
		: undefined}
>
	{#snippet actions()}
		<StatusBadge status={data.campaign.status} />
	{/snippet}
</PageHeader>

<Flash message={form?.message} />

{#if !data.mailConfigured}
	<div class="panel mb-5 px-4 py-3" role="alert">
		<p class="text-sm">
			L'envoi n'est pas configuré : <code class="font-mono text-xs">RESEND_TOKEN</code> manque. Vous pouvez
			rédiger, mais ni l'essai ni la diffusion ne partiront.
		</p>
	</div>
{/if}

{#if data.campaign.status !== 'DRAFT'}
	<section class="panel mb-6 px-5 py-4" aria-labelledby="bilan">
		<h2 id="bilan" class="text-base font-semibold">
			{data.campaign.status === 'SENDING' ? 'Diffusion en cours' : 'Bilan de la diffusion'}
		</h2>

		{#if data.campaign.status === 'SENDING'}
			<div class="mt-3">
				<div
					class="bg-cream border-ink/15 h-3 overflow-hidden rounded-full border"
					role="progressbar"
					aria-valuemin={0}
					aria-valuemax={data.campaign.recipientCount}
					aria-valuenow={data.campaign.sentCount + data.campaign.failedCount}
					aria-label="Courriels remis à Resend"
				>
					<div class="bg-ink h-full" style="width: {Math.round(progress * 100)}%"></div>
				</div>
				<p class="text-muted mt-2 text-sm" aria-live="polite">
					{formatCount(data.campaign.sentCount)} envoyés sur {formatCount(
						data.campaign.recipientCount
					)}.
					{#if !data.running}
						La diffusion est à l'arrêt : {formatCount(data.queued)} courriels restent à envoyer.
					{/if}
				</p>
			</div>

			{#if data.campaign.lastError}
				<p class="text-danger mt-3 text-sm" role="alert">
					<strong class="font-semibold">Interrompue :</strong>
					{data.campaign.lastError}
				</p>
			{/if}

			{#if !data.running && data.writable}
				<form method="POST" action="?/send" use:enhance={track} class="mt-4">
					<button
						type="submit"
						disabled={busy !== null}
						class="bg-ink text-paper press rounded-pill inline-flex min-h-11 items-center px-4 py-2 text-sm font-semibold disabled:opacity-60"
					>
						Reprendre la diffusion
					</button>
				</form>
			{/if}
		{/if}

		<dl class="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-5">
			<div>
				<dt class="text-muted">Destinataires</dt>
				<dd class="font-mono text-lg font-semibold">{formatCount(data.campaign.recipientCount)}</dd>
			</div>
			<div>
				<dt class="text-muted">Remis</dt>
				<dd class="font-mono text-lg font-semibold">{formatCount(data.campaign.deliveredCount)}</dd>
			</div>
			<div>
				<dt class="text-muted">Rejetés</dt>
				<dd class="font-mono text-lg font-semibold">{formatCount(data.campaign.bouncedCount)}</dd>
			</div>
			<div>
				<dt class="text-muted">Signalés comme indésirables</dt>
				<dd class="font-mono text-lg font-semibold">
					{formatCount(data.campaign.complainedCount)}
				</dd>
			</div>
			<div>
				<dt class="text-muted">Échecs d'envoi</dt>
				<dd class="font-mono text-lg font-semibold">{formatCount(data.campaign.failedCount)}</dd>
			</div>
		</dl>
		<p class="text-muted mt-3 text-xs">
			« Remis » compte les accusés de réception des serveurs destinataires, pas les lectures : aucun
			pixel de suivi n'est posé dans les courriels. Une adresse rejetée définitivement ou qui
			signale l'infolettre est retirée de la liste.
			{#if data.campaign.sentAt}Diffusion terminée le {formatDate(
					data.campaign.sentAt
				)}{#if data.campaign.sentBy}, lancée par {data.campaign.sentBy.displayName}{/if}.{/if}
		</p>
	</section>
{/if}

<form method="POST" action="?/save" use:enhance={track} class="grid gap-6 xl:grid-cols-2">
	<div class="flex min-w-0 flex-col gap-6">
		<Panel title="Rédaction">
			<div class="flex flex-col gap-4">
				<label class="flex flex-col gap-1.5">
					<span class="text-sm font-semibold">Objet</span>
					<input
						name="subject"
						required
						maxlength="200"
						bind:value={subject}
						disabled={!editable}
						class={field}
					/>
				</label>

				<label class="flex flex-col gap-1.5">
					<span class="text-sm font-semibold">Texte d'aperçu</span>
					<span class="text-muted text-xs">
						Affiché par la messagerie à côté de l'objet. Facultatif, 150 caractères au plus.
					</span>
					<input
						name="preheader"
						maxlength="150"
						bind:value={preheader}
						disabled={!editable}
						class={field}
					/>
				</label>

				<label class="flex flex-col gap-1.5">
					<span class="text-sm font-semibold">Texte</span>
					<textarea
						name="markdown"
						rows="18"
						bind:value={markdown}
						disabled={!editable}
						class="{field} font-mono leading-relaxed"></textarea>
				</label>

				<details class="text-sm">
					<summary class="cursor-pointer font-semibold">Mise en forme</summary>
					<dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
						<dt class="font-mono text-xs"># Titre</dt>
						<dd>
							Titre principal ; <code class="font-mono text-xs">##</code> et
							<code class="font-mono text-xs">###</code> pour les niveaux suivants
						</dd>
						<dt class="font-mono text-xs">**gras** *italique*</dt>
						<dd>Emphase</dd>
						<dt class="font-mono text-xs">[texte](https://…)</dt>
						<dd>
							Lien ; un chemin comme <code class="font-mono text-xs">/donnees</code> pointe vers le site
						</dd>
						<dt class="font-mono text-xs">- élément</dt>
						<dd>
							Liste à puces ; <code class="font-mono text-xs">1.</code> pour une liste numérotée
						</dd>
						<dt class="font-mono text-xs">&gt; citation</dt>
						<dd>Citation</dd>
						<dt class="font-mono text-xs">![légende](https://…)</dt>
						<dd>Image, en HTTPS, seule sur sa ligne</dd>
						<dt class="font-mono text-xs">-&gt; [Texte](https://…)</dt>
						<dd>Bouton</dd>
						<dt class="font-mono text-xs">---</dt>
						<dd>Séparateur</dd>
					</dl>
					<p class="text-muted mt-3 text-xs">
						Le HTML n'est pas interprété : il s'affiche tel quel. C'est voulu, un courriel de
						l'association ne transporte ni script ni pixel de suivi.
					</p>
				</details>
			</div>

			{#snippet footer()}
				{#if editable}
					<div class="flex flex-wrap items-center gap-2">
						<button type="submit" disabled={busy !== null} class={secondary}>
							{busy === 'save' ? 'Enregistrement…' : 'Enregistrer'}
						</button>
						<button
							type="submit"
							formaction="?/test"
							disabled={busy !== null || !data.mailConfigured}
							class={secondary}
						>
							{busy === 'test' ? 'Envoi…' : `M'envoyer un essai`}
						</button>
						<span class="text-muted text-xs">à {data.testAddress}</span>
						<button
							type="button"
							onclick={() => (confirmingSend = true)}
							disabled={busy !== null || !data.mailConfigured || data.confirmed === 0}
							class="bg-ink text-paper press rounded-pill ml-auto inline-flex min-h-11 items-center px-4 py-2 text-sm font-semibold disabled:opacity-60"
						>
							Diffuser à {formatCount(data.confirmed)} adresse{data.confirmed > 1 ? 's' : ''}
						</button>
					</div>
				{:else if data.writable}
					<button type="submit" formaction="?/duplicate" class={secondary}>
						Repartir de cette campagne
					</button>
				{/if}
			{/snippet}
		</Panel>
	</div>

	<div class="flex min-w-0 flex-col gap-3">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h2 class="text-base font-semibold">Aperçu</h2>
			<div class="flex gap-1" role="group" aria-label="Largeur de l'aperçu">
				<button
					type="button"
					aria-pressed={width === 'desktop'}
					onclick={() => (width = 'desktop')}
					class="rounded-pill min-h-11 border px-3 text-sm {width === 'desktop'
						? 'bg-ink text-paper border-ink'
						: 'border-ink/25 bg-paper'}"
				>
					Ordinateur
				</button>
				<button
					type="button"
					aria-pressed={width === 'mobile'}
					onclick={() => (width = 'mobile')}
					class="rounded-pill min-h-11 border px-3 text-sm {width === 'mobile'
						? 'bg-ink text-paper border-ink'
						: 'border-ink/25 bg-paper'}"
				>
					Téléphone
				</button>
			</div>
		</div>
		<p class="text-muted text-sm">
			<span class="font-semibold">{subject || 'Sans objet'}</span>
			{#if preheader}<span> · {preheader}</span>{/if}
		</p>
		<!-- `sandbox` vide : ni script, ni formulaire, ni navigation depuis l'apercu. -->
		<iframe
			title="Aperçu du courriel"
			sandbox=""
			srcdoc={preview}
			class="border-ink/15 rounded-panel mx-auto h-[44rem] w-full border bg-white"
			style:max-width={width === 'mobile' ? '375px' : '100%'}
		></iframe>
	</div>
</form>

{#if editable}
	<div class="border-ink/12 mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-6">
		<p class="text-muted text-sm">Un brouillon supprimé ne se récupère pas.</p>
		<button
			type="button"
			onclick={() => (confirmingDelete = true)}
			class="border-ink/25 text-danger bg-paper press rounded-pill inline-flex min-h-11 items-center border px-4 py-2 text-sm font-medium"
		>
			Supprimer ce brouillon
		</button>
	</div>
{/if}

<Dialog
	open={confirmingSend}
	title="Diffuser la campagne ?"
	onClose={() => (confirmingSend = false)}
>
	<p>
		« {subject} » part à <strong>{formatCount(data.confirmed)}</strong> adresse{data.confirmed > 1
			? 's'
			: ''} confirmée{data.confirmed > 1 ? 's' : ''}. Une fois lancée, la diffusion ne s'annule pas
		et le texte ne se modifie plus.
	</p>
	<p class="text-muted mt-2">Le texte affiché à l'écran est enregistré avant l'envoi.</p>
	{#snippet footer()}
		<button type="button" onclick={() => (confirmingSend = false)} class={secondary}>Annuler</button
		>
		<button
			type="submit"
			form="send-form"
			class="bg-ink text-paper press rounded-pill inline-flex min-h-11 items-center px-4 py-2 text-sm font-semibold"
		>
			Diffuser maintenant
		</button>
	{/snippet}
</Dialog>

<!-- Le formulaire de diffusion reprend les champs a l'ecran, pour que parte ce
     qui est affiche et non la derniere version enregistree. -->
<form
	id="send-form"
	method="POST"
	action="?/send"
	use:enhance={closeAfter(() => (confirmingSend = false))}
	class="hidden"
>
	<input type="hidden" name="subject" value={subject} />
	<input type="hidden" name="preheader" value={preheader} />
	<input type="hidden" name="markdown" value={markdown} />
</form>

<Dialog
	open={confirmingDelete}
	title="Supprimer ce brouillon ?"
	onClose={() => (confirmingDelete = false)}
>
	<p>« {subject} » sera supprimé. Rien n'a été envoyé, rien ne sera perdu chez les abonnés.</p>
	{#snippet footer()}
		<button type="button" onclick={() => (confirmingDelete = false)} class={secondary}
			>Annuler</button
		>
		<form method="POST" action="?/delete" use:enhance>
			<button
				type="submit"
				class="bg-danger text-paper press rounded-pill inline-flex min-h-11 items-center px-4 py-2 text-sm font-semibold"
			>
				Supprimer
			</button>
		</form>
	{/snippet}
</Dialog>
