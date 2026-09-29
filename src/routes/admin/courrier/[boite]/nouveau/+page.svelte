<script lang="ts">
	import Composer from '$components/admin/mail/Composer.svelte';
	import Flash from '$components/admin/Flash.svelte';
	import { formatMailbox } from '$lib/shared/mail/address';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const values = $derived(
		form?.values ?? { to: data.to, cc: '', bcc: '', subject: '', markdown: '' }
	);
</script>

<svelte:head><title>Nouveau message, {data.mailbox.address}</title></svelte:head>

<h1 class="mb-4 text-2xl font-bold tracking-tight">Nouveau message</h1>

<Flash message={form?.message} />

<div class="panel px-5 py-4">
	<Composer
		action="?/send"
		from={formatMailbox({ name: data.mailbox.displayName, address: data.mailbox.address })}
		{values}
		signature={data.signature}
		disabled={!data.mailConfigured}
	/>
</div>
