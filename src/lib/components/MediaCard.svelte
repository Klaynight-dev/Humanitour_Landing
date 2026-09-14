<script lang="ts">
	import { formatDuration, getMediaType, type MediaRecord } from '$lib/shared/media';
	import { formatDate } from '$lib/shared/format';

	interface Props {
		media: MediaRecord;
	}

	let { media }: Props = $props();

	const type = $derived(getMediaType(media.kind));
	const duration = $derived(
		typeof media.data.durationSeconds === 'number' ? media.data.durationSeconds : null
	);

	/**
	 * Une reprise de presse renvoie chez le media d'origine ; tout le reste vit
	 * ici. La carte suit donc la nature, sans cas particulier dans la page.
	 */
	const href = $derived(
		media.kind === 'PRESS' && typeof media.data.sourceUrl === 'string'
			? media.data.sourceUrl
			: `/medias/${media.slug}`
	);
	const isOutbound = $derived(media.kind === 'PRESS');
</script>

<article class="brut brut-press rounded-card bg-paper flex h-full flex-col overflow-hidden">
	{#if media.coverUrl}
		<img
			src={media.coverUrl}
			alt={media.coverAlt ?? ''}
			class="aspect-[16/9] w-full object-cover"
			loading="lazy"
		/>
	{/if}

	<div class="flex flex-1 flex-col p-5">
		<div class="flex flex-wrap items-center gap-2 text-xs">
			<span class="bg-coral-50 text-coral-700 rounded-pill px-2.5 py-1 font-semibold">
				{type?.label ?? media.kind}
			</span>
			{#if duration}
				<span class="text-muted tabular">{formatDuration(duration)}</span>
			{/if}
			{#if media.publishedAt}
				<time class="text-muted" datetime={media.publishedAt.toISOString()}>
					{formatDate(media.publishedAt)}
				</time>
			{/if}
		</div>

		<h3 class="font-display mt-3 text-lg leading-snug font-semibold">
			<a
				{href}
				target={isOutbound ? '_blank' : undefined}
				rel={isOutbound ? 'noopener noreferrer' : undefined}
				class="hover:underline"
			>
				{media.title}
			</a>
		</h3>

		{#if media.excerpt}
			<p class="text-ink-soft mt-2 text-sm leading-relaxed">{media.excerpt}</p>
		{/if}

		<div class="text-muted mt-auto pt-4 text-xs">
			{#if isOutbound && typeof media.data.sourceName === 'string'}
				<!-- Le nom du media source est affiche AVANT le clic : le lecteur doit
				     savoir qui parle sans avoir a quitter la page. -->
				<span>Paru dans {media.data.sourceName}</span>
			{:else if media.authorName}
				<span>Par {media.authorName}</span>
			{/if}
		</div>
	</div>
</article>
