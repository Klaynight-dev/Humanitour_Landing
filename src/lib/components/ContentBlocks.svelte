<script lang="ts">
	import Button from '$components/Button.svelte';
	import RichText from '$components/RichText.svelte';
	import { readString, type ContentBlockRecord } from '$lib/shared/content';
	import { parseRichText } from '$lib/shared/content/richtext';

	interface Props {
		blocks: readonly ContentBlockRecord[];
	}

	let { blocks }: Props = $props();

	/** Les quatre emplacements de chiffres, sans ceux qui sont vides. */
	function figures(raw: unknown): { value: string; label: string }[] {
		return [1, 2, 3, 4]
			.map((index) => ({
				value: readString(raw, `value${index}`),
				label: readString(raw, `label${index}`)
			}))
			.filter(
				(figure): figure is { value: string; label: string } =>
					figure.value !== null && figure.label !== null
			);
	}
</script>

<!--
	Rendu des blocs edites au back-office.
	Chaque type du registre a sa branche ici, et une seule : c est le point ou la
	donnee devient de la mise en page. Un type inconnu ne casse pas la page, il ne
	s affiche pas — desinstaller un type de bloc ne doit pas mettre le site par
	terre.
-->
{#each blocks as block (block.id)}
	{#if block.type === 'hero'}
		<section class="mx-auto max-w-6xl px-4 py-16 sm:px-6">
			<div class="grid items-center gap-10 lg:grid-cols-2">
				<div>
					<h1 class="font-display text-4xl leading-tight sm:text-5xl">
						{readString(block.data, 'title')}
					</h1>
					{#if readString(block.data, 'subtitle')}
						<p class="measure text-ink-soft mt-5 text-lg">
							{readString(block.data, 'subtitle')}
						</p>
					{/if}
					{#if readString(block.data, 'ctaLabel') && readString(block.data, 'ctaHref')}
						<div class="mt-8">
							<Button href={readString(block.data, 'ctaHref') ?? '/'}>
								{readString(block.data, 'ctaLabel')}
							</Button>
						</div>
					{/if}
				</div>

				{#if readString(block.data, 'imageUrl')}
					<div class="photo-block">
						<img
							src={readString(block.data, 'imageUrl')}
							alt={readString(block.data, 'imageAlt') ?? ''}
							loading="lazy"
							class="h-auto w-full"
						/>
					</div>
				{/if}
			</div>
		</section>
	{:else if block.type === 'rich-text'}
		<section class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
			{#if readString(block.data, 'title')}
				<h2 class="font-display text-2xl sm:text-3xl">{readString(block.data, 'title')}</h2>
			{/if}
			<RichText doc={parseRichText(block.data.body)} />
		</section>
	{:else if block.type === 'figures'}
		<section class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
			{#if readString(block.data, 'title')}
				<h2 class="font-display mb-6 text-2xl sm:text-3xl">{readString(block.data, 'title')}</h2>
			{/if}
			<dl class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
				{#each figures(block.data) as figure (figure.label)}
					<div class="block-card p-6">
						<dt class="font-display text-3xl">{figure.value}</dt>
						<dd class="text-muted mt-2 text-sm">{figure.label}</dd>
					</div>
				{/each}
			</dl>
		</section>
	{:else if block.type === 'quote'}
		<section class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
			<figure class="block-card p-8">
				<blockquote class="measure text-xl">« {readString(block.data, 'quote')} »</blockquote>
				<figcaption class="text-muted mt-4 text-sm">
					{readString(block.data, 'author')}
					{#if readString(block.data, 'sourceUrl')}
						—
						<a
							href={readString(block.data, 'sourceUrl')}
							class="underline decoration-2 underline-offset-2"
						>
							la source
						</a>
					{/if}
				</figcaption>
			</figure>
		</section>
	{/if}
{/each}
