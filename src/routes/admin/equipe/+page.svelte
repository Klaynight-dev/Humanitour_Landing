<script lang="ts">
	import { enhance } from '$app/forms';
	import Flash from '$components/admin/Flash.svelte';
	import PageHeader from '$components/admin/PageHeader.svelte';
	import Panel from '$components/admin/Panel.svelte';
	import Table from '$components/admin/Table.svelte';
	import { formatDate } from '$lib/shared/format';
	import { can } from '$lib/shared/permissions';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const manager = $derived(can(data.user, 'user.manage'));
</script>

<svelte:head><title>Équipe, back-office</title></svelte:head>

<PageHeader
	title="Équipe"
	description="Il n'y a pas d'inscription publique : on rejoint la plateforme par invitation."
/>

<Flash message={form?.message}>
	{#if form?.invitationUrl}
		<p class="text-muted mt-2 text-xs">Lien d'invitation, valable sept jours :</p>
		<code class="bg-cream mt-1 block overflow-x-auto rounded px-2 py-1.5 text-xs">
			{form.invitationUrl}
		</code>
	{/if}
</Flash>

<div class="flex flex-col gap-6">
	{#if manager}
		<Panel
			title="Inviter un membre"
			description="Le lien est affiché une seule fois. Aucun courriel n'est envoyé : transmettez-le par le canal que vous jugez sûr."
		>
			<form method="POST" action="?/invite" use:enhance class="flex flex-wrap items-end gap-3">
				<label class="flex min-w-56 flex-1 flex-col gap-1.5">
					<span class="text-sm font-semibold">Adresse électronique</span>
					<input
						type="email"
						name="email"
						required
						class="border-ink/20 bg-paper rounded-field border px-3 py-2 min-h-11"
					/>
				</label>
				<label class="flex flex-col gap-1.5">
					<span class="text-sm font-semibold">Rôle</span>
					<select name="roleId" class="border-ink/20 bg-paper rounded-field border px-3 py-2 min-h-11">
						{#each data.roles as role (role.id)}
							<option value={role.id}>{role.name}</option>
						{/each}
					</select>
				</label>
				<button
					type="submit"
					class="bg-ink text-paper press rounded-pill px-5 py-2.5 text-sm font-semibold min-h-11 inline-flex items-center justify-center"
				>
					Inviter
				</button>
			</form>
		</Panel>
	{/if}

	{#if data.invitations.length > 0}
		<Panel title="Invitations en attente">
			<ul class="flex flex-col gap-2">
				{#each data.invitations as invitation (invitation.id)}
					<li class="border-ink/20 flex flex-wrap items-center justify-between gap-3 rounded-field border p-3 min-h-11">
						<div>
							<p class="text-sm font-medium">{invitation.email}</p>
							<p class="text-muted text-xs">
								{invitation.role.name}, expire le {formatDate(invitation.expiresAt)}
							</p>
						</div>
						{#if manager}
							<form method="POST" action="?/revokeInvitation" use:enhance>
								<input type="hidden" name="id" value={invitation.id} />
								<button
									type="submit"
									class="border-ink/25 text-danger bg-paper press rounded-pill border px-3 py-1.5 text-xs min-h-11 inline-flex items-center justify-center"
								>
									Révoquer
								</button>
							</form>
						{/if}
					</li>
				{/each}
			</ul>
		</Panel>
	{/if}

	<Panel title="Comptes">
		<Table empty={data.users.length === 0} emptyTitle="Aucun compte">
			{#snippet head()}
				<th scope="col" class="py-2 pr-3 font-semibold">Membre</th>
				<th scope="col" class="px-3 py-2 font-semibold">Rôle</th>
				<th scope="col" class="px-3 py-2 font-semibold">Dernière connexion</th>
				<th scope="col" class="py-2 pl-3 text-right font-semibold">État</th>
			{/snippet}
			{#snippet body()}
				{#each data.users as member (member.id)}
					<tr class="border-ink/12 border-b last:border-0">
						<td class="py-2.5 pr-3">
							<p class="font-medium">{member.displayName}</p>
							<p class="text-muted text-xs">{member.email}</p>
						</td>
						<td class="px-3 py-2.5">
							{#if manager}
								<form method="POST" action="?/setRole" use:enhance class="flex gap-2">
									<input type="hidden" name="id" value={member.id} />
									<select
										name="roleId"
										class="border-ink/20 bg-paper rounded-field border px-2 py-1 text-xs min-h-11"
										onchange={(event) => event.currentTarget.form?.requestSubmit()}
									>
										{#each data.roles as role (role.id)}
											<option value={role.id} selected={role.id === member.role.id}>
												{role.name}
											</option>
										{/each}
									</select>
									<noscript>
										<button type="submit" class="border-ink/20 rounded-field border px-2 text-xs min-h-11">
											OK
										</button>
									</noscript>
								</form>
							{:else}
								{member.role.name}
							{/if}
						</td>
						<td class="text-muted px-3 py-2.5 text-xs">
							{member.lastLoginAt ? formatDate(member.lastLoginAt) : 'jamais'}
						</td>
						<td class="py-2.5 pl-3 text-right">
							{#if manager && member.id !== data.user.id}
								<form method="POST" action="?/toggleActive" use:enhance>
									<input type="hidden" name="id" value={member.id} />
									<button
										type="submit"
										class="border-ink/25 press bg-paper rounded-pill border px-3 py-1.5 text-xs font-medium min-h-11 inline-flex items-center justify-center"
									>
										{member.isActive ? 'Désactiver' : 'Réactiver'}
									</button>
								</form>
							{:else}
								<span class="text-muted text-xs">
									{member.isActive ? 'Actif' : 'Désactivé'}
								</span>
							{/if}
						</td>
					</tr>
				{/each}
			{/snippet}
		</Table>
	</Panel>
</div>
