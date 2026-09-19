<script lang="ts">
	import { enhance } from '$app/forms';
	import Dialog from '$components/admin/Dialog.svelte';
	import Flash from '$components/admin/Flash.svelte';
	import PageHeader from '$components/admin/PageHeader.svelte';
	import Panel from '$components/admin/Panel.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let creating = $state(false);
	let deleteTarget: { id: string; name: string } | null = $state(null);
	let deleteForm: HTMLFormElement | undefined = $state();
</script>

<svelte:head><title>Rôles, back-office</title></svelte:head>

<PageHeader
	title="Rôles"
	description="Un rôle est un paquet de permissions. En créer un ne demande aucun déploiement."
>
	{#snippet actions()}
		<button
			type="button"
			onclick={() => (creating = !creating)}
			class="bg-ink text-paper press rounded-pill px-4 py-2 text-sm font-semibold min-h-11 inline-flex items-center justify-center"
		>
			{creating ? 'Annuler' : 'Nouveau rôle'}
		</button>
	{/snippet}
</PageHeader>

<Flash message={form?.message} />

{#if creating}
	<div class="mb-6">
		<Panel title="Nouveau rôle">
			<form method="POST" action="?/create" use:enhance class="flex flex-wrap items-end gap-3">
				<label class="flex min-w-48 flex-col gap-1.5">
					<span class="text-sm font-semibold">Nom</span>
					<input
						name="name"
						required
						minlength="3"
						placeholder="Bénévole région Sud"
						class="border-ink/20 bg-paper rounded-field border px-3 py-2 min-h-11"
					/>
				</label>
				<label class="flex min-w-56 flex-1 flex-col gap-1.5">
					<span class="text-sm font-semibold">Description</span>
					<input name="description" class="border-ink/20 bg-paper rounded-field border px-3 py-2 min-h-11" />
				</label>
				<button
					type="submit"
					class="bg-ink text-paper press rounded-pill px-5 py-2.5 text-sm font-semibold min-h-11 inline-flex items-center justify-center"
				>
					Créer
				</button>
			</form>
		</Panel>
	</div>
{/if}

<div class="flex flex-col gap-6">
	{#each data.roles as role (role.id)}
		<Panel
			title={role.name}
			description="{role.userCount} compte(s), {role.permissions.length} permission(s){role.isSystem
				? ', rôle système'
				: ''}"
		>
			<form method="POST" action="?/update" use:enhance class="flex flex-col gap-5">
				<input type="hidden" name="id" value={role.id} />

				<div class="grid gap-4 sm:grid-cols-2">
					<label class="flex flex-col gap-1.5">
						<span class="text-sm font-semibold">Nom</span>
						<input name="name" value={role.name} class="border-ink/20 bg-paper rounded-field border px-3 py-2 min-h-11" />
					</label>
					<label class="flex flex-col gap-1.5">
						<span class="text-sm font-semibold">Description</span>
						<input
							name="description"
							value={role.description ?? ''}
							class="border-ink/20 bg-paper rounded-field border px-3 py-2 min-h-11"
						/>
					</label>
				</div>

				{#each data.groups as group (group.group)}
					<fieldset class="border-ink/20 rounded-field border p-4 min-h-11">
						<legend class="px-1 text-xs font-semibold tracking-wide uppercase">
							{group.group}
						</legend>
						<div class="grid gap-2.5 sm:grid-cols-2">
							{#each group.permissions as permission (permission.key)}
								<label class="flex items-start gap-2.5">
									<input
										type="checkbox"
										name="perm:{permission.key}"
										checked={role.permissions.includes(permission.key)}
										class="accent-coral mt-0.5 h-4 w-4"
									/>
									<span class="text-sm">
										<span class="font-medium">{permission.label}</span>
										{#if permission.sensitive}
											<span class="text-coral-ink ml-1 text-xs font-semibold">sensible</span>
										{/if}
										<span class="text-muted block text-xs">{permission.description}</span>
									</span>
								</label>
							{/each}
						</div>
					</fieldset>
				{/each}

				<div class="flex flex-wrap gap-2">
					<button
						type="submit"
						class="bg-ink text-paper press rounded-pill px-5 py-2.5 text-sm font-semibold min-h-11 inline-flex items-center justify-center"
					>
						Enregistrer
					</button>
					{#if !role.isSystem}
						<button
							type="button"
							onclick={() => (deleteTarget = { id: role.id, name: role.name })}
							class="border-ink/25 text-danger bg-paper press rounded-pill border px-4 py-2.5 text-sm font-medium min-h-11 inline-flex items-center justify-center"
						>
							Supprimer ce rôle
						</button>
					{/if}
				</div>
			</form>
		</Panel>
	{/each}
</div>

<form bind:this={deleteForm} method="POST" action="?/delete" use:enhance class="hidden">
	<input type="hidden" name="id" value={deleteTarget?.id ?? ''} />
</form>

<Dialog
	open={deleteTarget !== null}
	title="Supprimer ce rôle ?"
	onClose={() => (deleteTarget = null)}
>
	<p>
		« {deleteTarget?.name} » sera supprimé. Les comptes qui le portent doivent d'abord recevoir un
		autre rôle.
	</p>
	{#snippet footer()}
		<button
			type="button"
			onclick={() => (deleteTarget = null)}
			class="border-ink/25 press bg-paper rounded-pill border px-4 py-2 text-sm font-medium min-h-11 inline-flex items-center justify-center"
		>
			Annuler
		</button>
		<button
			type="button"
			onclick={() => deleteForm?.requestSubmit()}
			class="text-danger border-ink/25 press bg-paper rounded-pill border px-4 py-2 text-sm font-semibold min-h-11 inline-flex items-center justify-center"
		>
			Supprimer
		</button>
	{/snippet}
</Dialog>
