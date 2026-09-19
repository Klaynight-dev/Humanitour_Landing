<script lang="ts">
	import type { RichTextDoc, RichTextInline } from '$lib/shared/content/richtext';

	interface Props {
		doc: RichTextDoc;
	}

	let { doc }: Props = $props();

	function isStrong(run: RichTextInline): boolean {
		return run.marks?.includes('strong') ?? false;
	}

	function isEm(run: RichTextInline): boolean {
		return run.marks?.includes('em') ?? false;
	}
</script>

<!--
	Rendu du texte enrichi.

	Chaque noeud devient un vrai element : il n'y a pas un seul `{@html}` dans ce
	fichier, et c'est volontaire. Le contenu vient du back-office, donc d'humains,
	mais un compte compromis ne doit pas pouvoir poser de balise sur le site
	public. Ici, il ne peut produire que ce que le modele decrit.
-->
{#snippet runs(item: RichTextInline[])}
	{#each item as run, index (index)}
		{#if run.href}
			<a href={run.href} class="underline decoration-2 underline-offset-2">
				{#if isStrong(run)}<strong>{#if isEm(run)}<em>{run.text}</em>{:else}{run.text}{/if}</strong
					>{:else if isEm(run)}<em>{run.text}</em>{:else}{run.text}{/if}
			</a>
		{:else if isStrong(run)}
			<strong>{#if isEm(run)}<em>{run.text}</em>{:else}{run.text}{/if}</strong>
		{:else if isEm(run)}
			<em>{run.text}</em>
		{:else}
			{run.text}
		{/if}
	{/each}
{/snippet}

{#each doc.blocks as block, index (index)}
	{#if block.type === 'heading'}
		{#each block.items as item, itemIndex (itemIndex)}
			<h3 class="font-display mt-8 text-xl sm:text-2xl">{@render runs(item)}</h3>
		{/each}
	{:else if block.type === 'bullet-list'}
		<ul class="measure mt-4 flex list-disc flex-col gap-2 pl-5">
			{#each block.items as item, itemIndex (itemIndex)}
				<li>{@render runs(item)}</li>
			{/each}
		</ul>
	{:else if block.type === 'ordered-list'}
		<ol class="measure mt-4 flex list-decimal flex-col gap-2 pl-5">
			{#each block.items as item, itemIndex (itemIndex)}
				<li>{@render runs(item)}</li>
			{/each}
		</ol>
	{:else}
		{#each block.items as item, itemIndex (itemIndex)}
			<p class="measure text-ink-soft mt-4">{@render runs(item)}</p>
		{/each}
	{/if}
{/each}
