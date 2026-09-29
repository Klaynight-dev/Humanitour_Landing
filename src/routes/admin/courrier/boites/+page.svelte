<script lang="ts">
	import { enhance } from '$app/forms';
	import { closeAfter } from '$components/admin/enhance';
	import Dialog from '$components/admin/Dialog.svelte';
	import Flash from '$components/admin/Flash.svelte';
	import PageHeader from '$components/admin/PageHeader.svelte';
	import Panel from '$components/admin/Panel.svelte';
	import { formatCount } from '$lib/shared/format';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let kind: 'SHARED' | 'PERSONAL' = $state('SHARED');
	let deleting: PageData['mailboxes'][number] | null = $state(null);

	const field = 'border-ink/20 bg-paper rounded-field min-h-11 border px-3 py-2 text-sm';
	const secondary =
		'border-ink/25 bg-paper press rounded-pill inline-flex min-h-11 items-center border px-4 py-2 text-sm';
	const primary =
		'bg-ink text-paper press rounded-pill inline-flex min-h-11 items-center px-4 py-2 text-sm font-semibold';

	/** Les comptes qui ne lisent pas encore cette boite, pour la liste d'ajout. */
	function candidates(mailbox: PageData['mailboxes'][number]) {
		return data.users.filter(
			(user) => !mailbox.members.some((member) => member.userId === user.id)
		);
	}
</script>

<svelte:head><title>Boîtes de la messagerie, back-office</title></svelte:head>

<PageHeader
	title="Boîtes"
	breadcrumb={[{ label: 'Courrier', href: '/admin/courrier' }]}
	description="Qui lit quelle adresse. Gérer les boîtes ne donne à lire aucune d'elles : pour lire contact@, ajoutez-vous à ses membres."
/>

<Flash message={form?.message} />

<div class="mb-8">
	<Panel
		title="Nouvelle boîte"
		description="Toute adresse en @{data.domain} qui n'a pas de boîte arrive dans la boîte attrape-tout."
	>
		<form method="POST" action="?/create" use:enhance class="grid gap-4 md:grid-cols-2">
			<fieldset class="flex flex-col gap-2 md:col-span-2">
				<legend class="mb-1 text-sm font-semibold">Type</legend>
				<label class="flex min-h-11 items-center gap-2 text-sm">
					<input
						type="radio"
						name="kind"
						value="SHARED"
						bind:group={kind}
						class="accent-ink size-4"
					/>
					Partagée : lue par ses membres, par exemple contact@ ou presse@
				</label>
				<label class="flex min-h-11 items-center gap-2 text-sm">
					<input
						type="radio"
						name="kind"
						value="PERSONAL"
						bind:group={kind}
						class="accent-ink size-4"
					/>
					Personnelle : lue par son seul titulaire
				</label>
			</fieldset>

			<label class="flex flex-col gap-1.5">
				<span class="text-sm font-semibold">Adresse</span>
				<span class="flex items-center gap-2">
					<input
						name="localPart"
						required
						autocomplete="off"
						class="{field} min-w-0 flex-1"
						placeholder="presse"
					/>
					<span class="text-muted text-sm">@{data.domain}</span>
				</span>
			</label>

			<label class="flex flex-col gap-1.5">
				<span class="text-sm font-semibold">Nom affiché aux destinataires</span>
				<input name="displayName" required class={field} placeholder="Humanitour" />
			</label>

			{#if kind === 'PERSONAL'}
				<label class="flex flex-col gap-1.5">
					<span class="text-sm font-semibold">Titulaire</span>
					<select name="ownerId" required class={field}>
						<option value="">Choisir un compte</option>
						{#each data.users as user (user.id)}
							<option value={user.id}>{user.displayName} ({user.email})</option>
						{/each}
					</select>
				</label>
			{:else}
				<label class="flex min-h-11 items-center gap-2 self-end text-sm">
					<input type="checkbox" name="isCatchAll" class="accent-ink size-4" />
					Recevoir aussi le courrier des adresses sans boîte
				</label>
			{/if}

			<div class="md:col-span-2">
				<button type="submit" class={primary}>Créer la boîte</button>
			</div>
		</form>
	</Panel>
</div>

{#if data.mailboxes.length === 0}
	<p class="text-muted text-sm">
		Aucune boîte pour l'instant : le courrier reçu n'a nulle part où aller. Créez au moins une boîte
		partagée qui reçoit le courrier des adresses sans boîte.
	</p>
{/if}

<div class="flex flex-col gap-6">
	{#each data.mailboxes as mailbox (mailbox.id)}
		<Panel
			title={mailbox.address}
			description="{mailbox.kind === 'PERSONAL'
				? `Personnelle, lue par ${mailbox.owner?.displayName ?? 'un compte supprimé'}`
				: 'Partagée'}{mailbox.isCatchAll
				? ' · reçoit le courrier des adresses sans boîte'
				: ''} · {formatCount(mailbox._count.threads)} fil{mailbox._count.threads > 1 ? 's' : ''}"
		>
			<div class="grid gap-6 lg:grid-cols-2">
				<form method="POST" action="?/update" use:enhance class="flex flex-col gap-3">
					<input type="hidden" name="id" value={mailbox.id} />
					<label class="flex flex-col gap-1.5">
						<span class="text-sm font-semibold">Nom affiché</span>
						<input name="displayName" required value={mailbox.displayName} class={field} />
					</label>
					<label class="flex flex-col gap-1.5">
						<span class="text-sm font-semibold">Signature</span>
						<span class="text-muted text-xs"
							>Ajoutée sous chaque message envoyé depuis cette boîte.</span
						>
						<textarea name="signature" rows="3" class={field}>{mailbox.signature ?? ''}</textarea>
					</label>
					{#if mailbox.kind === 'SHARED'}
						<label class="flex min-h-11 items-center gap-2 text-sm">
							<input
								type="checkbox"
								name="isCatchAll"
								checked={mailbox.isCatchAll}
								class="accent-ink size-4"
							/>
							Recevoir le courrier des adresses sans boîte
						</label>
					{/if}
					<div>
						<button type="submit" class={secondary}>Enregistrer</button>
					</div>
				</form>

				{#if mailbox.kind === 'SHARED'}
					<div class="flex flex-col gap-3">
						<h3 class="text-sm font-semibold">Membres</h3>
						{#if mailbox.members.length === 0}
							<p class="text-muted text-sm">
								Personne ne lit cette boîte : le courrier qui y arrive n'est vu par personne.
							</p>
						{:else}
							<ul class="flex flex-col gap-1">
								{#each mailbox.members as member (member.userId)}
									<li class="flex flex-wrap items-center justify-between gap-2 text-sm">
										<span>
											{member.user.displayName}
											<span class="text-muted">{member.user.email}</span>
										</span>
										<form method="POST" action="?/removeMember" use:enhance>
											<input type="hidden" name="mailboxId" value={mailbox.id} />
											<input type="hidden" name="userId" value={member.userId} />
											<button type="submit" class="{secondary} text-danger">Retirer</button>
										</form>
									</li>
								{/each}
							</ul>
						{/if}

						{#if candidates(mailbox).length > 0}
							<form
								method="POST"
								action="?/addMember"
								use:enhance
								class="flex flex-wrap items-end gap-2"
							>
								<input type="hidden" name="mailboxId" value={mailbox.id} />
								<label class="flex min-w-0 flex-1 flex-col gap-1.5">
									<span class="text-sm font-semibold">Ajouter un membre</span>
									<select name="userId" required class={field}>
										{#each candidates(mailbox) as user (user.id)}
											<option value={user.id}>{user.displayName}</option>
										{/each}
									</select>
								</label>
								<button type="submit" class={secondary}>Ajouter</button>
							</form>
						{/if}
					</div>
				{/if}
			</div>

			{#snippet footer()}
				<button type="button" onclick={() => (deleting = mailbox)} class="{secondary} text-danger">
					Supprimer la boîte
				</button>
			{/snippet}
		</Panel>
	{/each}
</div>

<Dialog
	open={deleting !== null}
	title="Supprimer {deleting?.address} ?"
	onClose={() => (deleting = null)}
>
	<p>
		La boîte et ses {formatCount(deleting?._count.threads ?? 0)} fils sont supprimés définitivement, pièces
		jointes comprises. Le courrier qui arrivera ensuite à cette adresse ira à la boîte attrape-tout, s'il
		y en a une.
	</p>
	{#snippet footer()}
		<button type="button" onclick={() => (deleting = null)} class={secondary}>Annuler</button>
		<form method="POST" action="?/delete" use:enhance={closeAfter(() => (deleting = null))}>
			<input type="hidden" name="id" value={deleting?.id ?? ''} />
			<button
				type="submit"
				class="bg-danger text-paper press rounded-pill inline-flex min-h-11 items-center px-4 py-2 text-sm font-semibold"
			>
				Supprimer définitivement
			</button>
		</form>
	{/snippet}
</Dialog>
