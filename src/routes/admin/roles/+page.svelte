<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '$components/admin/PageHeader.svelte';
	import Panel from '$components/admin/Panel.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let creating = $state(false);
</script>

<svelte:head><title>Roles — Back-office</title></svelte:head>

<PageHeader
	title="Roles"
	description="Un role est un paquet de permissions. En creer un ne demande aucun deploiement."
>
	{#snippet actions()}
		<button
			type="button"
			onclick={() => (creating = !creating)}
			class="bg-ink text-paper hover:bg-coral-600 rounded-pill px-4 py-2 text-sm font-semibold transition-colors"
		>
			{creating ? 'Annuler' : 'Nouveau role'}
		</button>
	{/snippet}
</PageHeader>

{#if form?.message}
	<p role="status" class="border-line bg-paper rounded-card mb-5 border px-4 py-3 text-sm">
		{form.message}
	</p>
{/if}

{#if creating}
	<div class="mb-6">
		<Panel title="Nouveau role">
			<form method="POST" action="?/create" use:enhance class="flex flex-wrap items-end gap-3">
				<label class="flex min-w-48 flex-col gap-1.5">
					<span class="text-sm font-semibold">Nom</span>
					<input
						name="name"
						required
						minlength="3"
						placeholder="Benevole region Sud"
						class="border-line rounded-lg border px-3 py-2"
					/>
				</label>
				<label class="flex min-w-56 flex-1 flex-col gap-1.5">
					<span class="text-sm font-semibold">Description</span>
					<input name="description" class="border-line rounded-lg border px-3 py-2" />
				</label>
				<button
					type="submit"
					class="bg-ink text-paper rounded-pill px-5 py-2.5 text-sm font-semibold"
				>
					Creer
				</button>
			</form>
		</Panel>
	</div>
{/if}

<div class="flex flex-col gap-6">
	{#each data.roles as role (role.id)}
		<Panel
			title={role.name}
			description="{role.userCount} compte(s) · {role.permissions.length} permission(s){role.isSystem
				? ' · role systeme'
				: ''}"
		>
			<form method="POST" action="?/update" use:enhance class="flex flex-col gap-5">
				<input type="hidden" name="id" value={role.id} />

				<div class="grid gap-4 sm:grid-cols-2">
					<label class="flex flex-col gap-1.5">
						<span class="text-sm font-semibold">Nom</span>
						<input name="name" value={role.name} class="border-line rounded-lg border px-3 py-2" />
					</label>
					<label class="flex flex-col gap-1.5">
						<span class="text-sm font-semibold">Description</span>
						<input
							name="description"
							value={role.description ?? ''}
							class="border-line rounded-lg border px-3 py-2"
						/>
					</label>
				</div>

				{#each data.groups as group (group.group)}
					<fieldset class="border-line rounded-lg border p-4">
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
										class="accent-coral-500 mt-0.5 h-4 w-4"
									/>
									<span class="text-sm">
										<span class="font-medium">{permission.label}</span>
										{#if permission.sensitive}
											<span class="text-coral-700 ml-1 text-xs font-semibold">sensible</span>
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
						class="bg-ink text-paper hover:bg-coral-600 rounded-pill px-5 py-2.5 text-sm font-semibold transition-colors"
					>
						Enregistrer
					</button>
					{#if !role.isSystem}
						<button
							type="submit"
							formaction="?/delete"
							class="border-danger/30 text-danger hover:bg-danger/5 rounded-pill border px-4 py-2.5 text-sm font-medium"
						>
							Supprimer ce role
						</button>
					{/if}
				</div>
			</form>
		</Panel>
	{/each}
</div>
