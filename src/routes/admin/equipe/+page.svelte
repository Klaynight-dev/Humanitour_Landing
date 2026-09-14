<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '$components/admin/PageHeader.svelte';
	import Panel from '$components/admin/Panel.svelte';
	import { formatDate } from '$lib/shared/format';
	import { can } from '$lib/shared/permissions';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const manager = $derived(can(data.user, 'user.manage'));
</script>

<svelte:head><title>Equipe — Back-office</title></svelte:head>

<PageHeader
	title="Equipe"
	description="Il n'y a pas d'inscription publique : on rejoint la plateforme par invitation."
/>

{#if form?.message}
	<div class="border-line bg-paper rounded-card mb-5 border px-4 py-3">
		<p role="status" class="text-sm">{form.message}</p>
		{#if form.invitationUrl}
			<p class="text-muted mt-2 text-xs">Lien d'invitation, valable sept jours :</p>
			<code class="bg-surface mt-1 block overflow-x-auto rounded px-2 py-1.5 text-xs">
				{form.invitationUrl}
			</code>
		{/if}
	</div>
{/if}

<div class="flex flex-col gap-6">
	{#if manager}
		<Panel
			title="Inviter un membre"
			description="Le lien est affiche une seule fois. Aucun courriel n'est envoye : transmettez-le par le canal que vous jugez sur."
		>
			<form method="POST" action="?/invite" use:enhance class="flex flex-wrap items-end gap-3">
				<label class="flex min-w-56 flex-1 flex-col gap-1.5">
					<span class="text-sm font-semibold">Adresse electronique</span>
					<input
						type="email"
						name="email"
						required
						class="border-line rounded-lg border px-3 py-2"
					/>
				</label>
				<label class="flex flex-col gap-1.5">
					<span class="text-sm font-semibold">Role</span>
					<select name="roleId" class="border-line rounded-lg border px-3 py-2">
						{#each data.roles as role (role.id)}
							<option value={role.id}>{role.name}</option>
						{/each}
					</select>
				</label>
				<button
					type="submit"
					class="bg-ink text-paper rounded-pill px-5 py-2.5 text-sm font-semibold"
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
					<li class="border-line flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
						<div>
							<p class="text-sm font-medium">{invitation.email}</p>
							<p class="text-muted text-xs">
								{invitation.role.name} · expire le {formatDate(invitation.expiresAt)}
							</p>
						</div>
						{#if manager}
							<form method="POST" action="?/revokeInvitation" use:enhance>
								<input type="hidden" name="id" value={invitation.id} />
								<button
									type="submit"
									class="border-danger/30 text-danger hover:bg-danger/5 rounded-pill border px-3 py-1.5 text-xs"
								>
									Revoquer
								</button>
							</form>
						{/if}
					</li>
				{/each}
			</ul>
		</Panel>
	{/if}

	<Panel title="Comptes">
		<div class="overflow-x-auto">
			<table class="w-full min-w-[40rem] border-collapse text-sm">
				<thead>
					<tr class="border-line border-b text-left">
						<th scope="col" class="py-2 pr-3 font-semibold">Membre</th>
						<th scope="col" class="px-3 py-2 font-semibold">Role</th>
						<th scope="col" class="px-3 py-2 font-semibold">Derniere connexion</th>
						<th scope="col" class="py-2 pl-3 text-right font-semibold">Etat</th>
					</tr>
				</thead>
				<tbody>
					{#each data.users as member (member.id)}
						<tr class="border-line border-b last:border-0">
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
											class="border-line rounded-lg border px-2 py-1 text-xs"
											onchange={(event) => event.currentTarget.form?.requestSubmit()}
										>
											{#each data.roles as role (role.id)}
												<option value={role.id} selected={role.id === member.role.id}>
													{role.name}
												</option>
											{/each}
										</select>
										<noscript>
											<button type="submit" class="border-line rounded-lg border px-2 text-xs">
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
											class="border-line hover:bg-surface rounded-pill border px-3 py-1.5 text-xs font-medium"
										>
											{member.isActive ? 'Desactiver' : 'Reactiver'}
										</button>
									</form>
								{:else}
									<span class="text-muted text-xs">
										{member.isActive ? 'Actif' : 'Desactive'}
									</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</Panel>
</div>
