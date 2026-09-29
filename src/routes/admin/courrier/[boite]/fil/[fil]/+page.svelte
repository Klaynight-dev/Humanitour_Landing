<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import { closeAfter } from '$components/admin/enhance';
	import Composer, { type ComposerValues } from '$components/admin/mail/Composer.svelte';
	import Dialog from '$components/admin/Dialog.svelte';
	import Flash from '$components/admin/Flash.svelte';
	import {
		formatMailbox,
		forwardSubject,
		replyRecipients,
		replySubject
	} from '$lib/shared/mail/address';
	import { formatBytes } from '$lib/shared/mail/attachments';
	import { formatMessageDate } from '$lib/shared/mail/dates';
	import { hasRemoteImages, sandboxedDocument } from '$lib/shared/mail/sandbox';
	import { STATUS_LABELS, isProblem } from '$lib/shared/mail/status';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const base = $derived(`/admin/courrier/${data.mailbox.id}`);
	const from = $derived(
		formatMailbox({ name: data.mailbox.displayName, address: data.mailbox.address })
	);

	type Mode = 'reponse' | 'tous' | 'transfert';
	type Message = PageData['messages'][number];

	let composing: { mode: Mode; messageId: string; values: ComposerValues } | null = $state(null);
	let composerEl: HTMLElement | undefined = $state();
	let remoteImages: Record<string, boolean> = $state({});
	let confirmingDelete = $state(false);

	interface ComposeFailure {
		readonly mode: string;
		readonly messageId: string;
		readonly to: string;
		readonly cc: string;
		readonly bcc: string;
		readonly subject: string;
		readonly markdown: string;
	}

	// Apres un envoi refuse, le formulaire revient avec la saisie : on le rouvre
	// tel quel plutot que de perdre le texte.
	$effect.pre(() => {
		const failed = form && 'compose' in form ? (form.compose as ComposeFailure | undefined) : null;
		if (!failed) return;
		composing = {
			mode: failed.mode as Mode,
			messageId: failed.messageId,
			values: {
				to: failed.to,
				cc: failed.cc,
				bcc: failed.bcc,
				subject: failed.subject,
				markdown: failed.markdown
			}
		};
	});

	async function open(mode: Mode, message: Message) {
		const recipients =
			mode === 'transfert'
				? { to: [], cc: [] }
				: replyRecipients(message, data.mailbox.address, mode === 'tous');
		composing = {
			mode,
			messageId: message.id,
			values: {
				to: recipients.to.join(', '),
				cc: recipients.cc.join(', '),
				bcc: '',
				subject:
					mode === 'transfert' ? forwardSubject(message.subject) : replySubject(message.subject),
				markdown: ''
			}
		};
		await tick();
		composerEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		composerEl
			?.querySelector<HTMLInputElement | HTMLTextAreaElement>(
				mode === 'transfert' ? 'input[name="to"]' : 'textarea'
			)
			?.focus();
	}

	/** Ajuste la hauteur du cadre a son contenu : pas de seconde barre de defilement. */
	function fitFrame(event: Event) {
		const frame = event.currentTarget as HTMLIFrameElement;
		const height = frame.contentDocument?.documentElement.scrollHeight;
		if (height) frame.style.height = `${Math.min(height + 16, 4000)}px`;
	}

	const last = $derived(data.messages.at(-1));
	const composingMessage = $derived(
		data.messages.find((message) => message.id === composing?.messageId)
	);

	const button =
		'border-ink/25 bg-paper press rounded-pill inline-flex min-h-11 items-center border px-3 py-1.5 text-sm';
	const MODE_TITLES: Record<Mode, string> = {
		reponse: 'Répondre',
		tous: 'Répondre à tous',
		transfert: 'Transférer'
	};
</script>

<svelte:head><title>{data.thread.subject}, {data.mailbox.address}</title></svelte:head>

<div class="mb-4 flex flex-wrap items-center gap-2">
	<a href={base} class={button}>Retour à la liste</a>

	<form method="POST" action="?/move" use:enhance class="contents">
		<button
			type="submit"
			name="op"
			value={data.thread.starred ? 'nepassuivre' : 'suivre'}
			aria-pressed={data.thread.starred}
			class={button}
		>
			{data.thread.starred ? 'Ne plus suivre' : 'Suivre'}
		</button>
		{#if data.thread.folder !== 'INBOX'}
			<button type="submit" name="op" value="reception" class={button}>Remettre en réception</button
			>
		{/if}
		{#if data.thread.folder === 'INBOX'}
			<button type="submit" name="op" value="archiver" class={button}>Archiver</button>
		{/if}
		{#if data.thread.folder !== 'SPAM'}
			<button type="submit" name="op" value="indesirable" class={button}>Indésirable</button>
		{/if}
		{#if data.thread.folder !== 'TRASH'}
			<button type="submit" name="op" value="corbeille" class={button}>Corbeille</button>
		{/if}
		<button type="submit" name="op" value="nonlu" class={button}>Marquer comme non lu</button>
	</form>

	{#if data.thread.folder === 'TRASH'}
		<button type="button" onclick={() => (confirmingDelete = true)} class="{button} text-danger">
			Supprimer définitivement
		</button>
	{/if}
</div>

<h1 class="mb-4 text-2xl font-bold tracking-tight break-words">{data.thread.subject}</h1>

<Flash message={form?.message} />

<ol class="flex flex-col gap-4">
	{#each data.messages as message (message.id)}
		{@const html = message.html}
		<li>
			<article class="panel overflow-hidden" aria-labelledby="entete-{message.id}">
				<header
					class="border-ink/12 flex flex-wrap items-start justify-between gap-3 border-b px-5 py-3"
				>
					<div class="min-w-0 text-sm">
						<p id="entete-{message.id}" class="break-words">
							<span class="font-semibold">{message.fromName ?? message.fromAddress}</span>
							{#if message.fromName}<span class="text-muted">
									&lt;{message.fromAddress}&gt;</span
								>{/if}
						</p>
						<p class="text-muted break-words">À : {message.to.join(', ')}</p>
						{#if message.cc.length > 0}<p class="text-muted break-words">
								Cc : {message.cc.join(', ')}
							</p>{/if}
						{#if message.bcc.length > 0}<p class="text-muted break-words">
								Cci : {message.bcc.join(', ')}
							</p>{/if}
						{#if message.direction === 'OUTBOUND'}
							<p
								class="mt-1 {isProblem(message.status)
									? 'text-danger font-semibold'
									: 'text-muted'}"
							>
								{STATUS_LABELS[message.status]}{#if message.sentBy}, par {message.sentBy
										.displayName}{/if}
								{#if message.statusDetail && isProblem(message.status)}
									: {message.statusDetail}{/if}
							</p>
						{/if}
					</div>
					<p class="text-muted shrink-0 text-xs">{formatMessageDate(message.sentAt)}</p>
				</header>

				{#if message.spoofed}
					<p class="bg-coral-wash text-coral-ink px-5 py-2 text-sm font-semibold" role="note">
						Ce message ne vient probablement pas de {message.fromAddress} : le domaine de l'expéditeur
						ne l'a pas authentifié (échec DMARC). Ne suivez pas ses liens sans vérifier.
					</p>
				{/if}

				<div class="px-5 py-4">
					{#if html}
						{#if hasRemoteImages(html) && !remoteImages[message.id]}
							<p class="text-muted mb-3 flex flex-wrap items-center gap-2 text-sm">
								Les images distantes sont bloquées : elles diraient à l'expéditeur que ce message a
								été ouvert.
								<button
									type="button"
									onclick={() => (remoteImages[message.id] = true)}
									class="underline decoration-2 underline-offset-2"
								>
									Afficher les images
								</button>
							</p>
						{/if}
						<!-- Sans `allow-scripts` : aucun script du message ne s'execute. La
						     politique de securite du document interdit toute requete sortante,
						     hors images autorisees. `allow-same-origin` sert seulement a
						     mesurer la hauteur du contenu. -->
						<iframe
							title="Message de {message.fromName ?? message.fromAddress}"
							sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
							srcdoc={sandboxedDocument(html, { remoteImages: remoteImages[message.id] ?? false })}
							onload={fitFrame}
							class="block h-64 w-full border-0"
						></iframe>
					{:else}
						<p class="text-sm leading-relaxed break-words whitespace-pre-wrap">
							{message.text ?? ''}
						</p>
					{/if}
				</div>

				{#if message.attachments.length > 0}
					<ul
						class="border-ink/12 flex flex-wrap gap-2 border-t px-5 py-3"
						aria-label="Pièces jointes"
					>
						{#each message.attachments as attachment (attachment.id)}
							<li>
								<a
									href="/admin/courrier/pieces/{attachment.id}"
									class="border-ink/20 bg-cream rounded-field inline-flex min-h-11 items-center gap-2 border px-3 py-1.5 text-sm"
								>
									<span class="max-w-60 truncate font-semibold">{attachment.filename}</span>
									<span class="text-muted text-xs">{formatBytes(attachment.size)}</span>
								</a>
							</li>
						{/each}
					</ul>
				{/if}

				<footer class="border-ink/12 flex flex-wrap gap-2 border-t px-5 py-3">
					<button type="button" onclick={() => open('reponse', message)} class={button}
						>Répondre</button
					>
					{#if message.cc.length > 0 || message.to.length > 1}
						<button type="button" onclick={() => open('tous', message)} class={button}
							>Répondre à tous</button
						>
					{/if}
					<button type="button" onclick={() => open('transfert', message)} class={button}
						>Transférer</button
					>
				</footer>
			</article>
		</li>
	{/each}
</ol>

<section bind:this={composerEl} class="mt-6 scroll-mt-4" aria-label="Rédaction">
	{#if composing && composingMessage}
		<div class="panel px-5 py-4">
			<h2 class="mb-3 text-base font-semibold">{MODE_TITLES[composing.mode]}</h2>
			<Composer
				action="?/send"
				{from}
				values={composing.values}
				hidden={{ mode: composing.mode, messageId: composing.messageId }}
				signature={data.signature}
				note={composing.mode === 'transfert' && composingMessage.attachments.length > 0
					? `Les ${composingMessage.attachments.length} pièce(s) jointe(s) du message d'origine partent avec le transfert.`
					: 'Le message cité est ajouté sous votre texte.'}
				disabled={!data.mailConfigured}
				onCancel={() => (composing = null)}
				onSent={() => (composing = null)}
			/>
		</div>
	{:else if last}
		<button
			type="button"
			onclick={() => open('reponse', last)}
			class="border-ink/25 bg-paper rounded-panel text-muted flex min-h-14 w-full items-center border border-dashed px-5 text-left text-sm"
		>
			Répondre à {last.direction === 'INBOUND'
				? (last.fromName ?? last.fromAddress)
				: last.to.join(', ')}…
		</button>
	{/if}
</section>

<Dialog
	open={confirmingDelete}
	title="Supprimer ce fil ?"
	onClose={() => (confirmingDelete = false)}
>
	<p>Ce fil et ses pièces jointes seront supprimés définitivement. Rien ne se récupère ensuite.</p>
	{#snippet footer()}
		<button type="button" onclick={() => (confirmingDelete = false)} class={button}>Annuler</button>
		<form
			method="POST"
			action="?/deleteForever"
			use:enhance={closeAfter(() => (confirmingDelete = false))}
		>
			<button
				type="submit"
				class="bg-danger text-paper press rounded-pill inline-flex min-h-11 items-center px-4 py-2 text-sm font-semibold"
			>
				Supprimer définitivement
			</button>
		</form>
	{/snippet}
</Dialog>
