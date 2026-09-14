<script lang="ts">
	import AudioPlayer from '$components/AudioPlayer.svelte';
	import MediaCard from '$components/MediaCard.svelte';
	import VideoEmbed from '$components/VideoEmbed.svelte';
	import { formatDate } from '$lib/shared/format';
	import { getMediaType } from '$lib/shared/media';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const media = $derived(data.media);
	const type = $derived(getMediaType(media.kind));

	function text(key: string): string | null {
		const value = media.data[key];
		return typeof value === 'string' ? value : null;
	}

	function number(key: string): number | null {
		const value = media.data[key];
		return typeof value === 'number' ? value : null;
	}
</script>

<svelte:head>
	<title>{media.title} — Humanitour</title>
	<meta name="description" content={media.excerpt ?? media.title} />
	<meta property="og:title" content={media.title} />
	<meta property="og:type" content="article" />
	{#if media.excerpt}<meta property="og:description" content={media.excerpt} />{/if}
	{#if media.coverUrl}<meta property="og:image" content={media.coverUrl} />{/if}
</svelte:head>

<article class="mx-auto max-w-3xl px-4 py-12 sm:px-6">
	<nav class="text-muted mb-6 text-sm" aria-label="Fil d'Ariane">
		<a href="/medias" class="hover:text-ink underline">Médias</a>
		<span aria-hidden="true"> / </span>
		<span>{type?.label ?? media.kind}</span>
	</nav>

	<header>
		<div class="flex flex-wrap items-center gap-3 text-xs">
			<span class="bg-coral-50 text-coral-700 rounded-pill px-2.5 py-1 font-semibold">
				{type?.label ?? media.kind}
			</span>
			{#if media.publishedAt}
				<time class="text-muted" datetime={media.publishedAt.toISOString()}>
					{formatDate(media.publishedAt)}
				</time>
			{/if}
			{#if media.authorName}
				<span class="text-muted">Par {media.authorName}</span>
			{/if}
		</div>

		<h1 class="font-display mt-4 text-4xl leading-tight font-semibold sm:text-5xl">
			{media.title}
		</h1>

		{#if text('standfirst')}
			<p class="text-ink-soft mt-4 text-lg leading-relaxed">{text('standfirst')}</p>
		{:else if media.excerpt}
			<p class="text-ink-soft mt-4 text-lg leading-relaxed">{media.excerpt}</p>
		{/if}
	</header>

	{#if media.coverUrl && media.kind !== 'VIDEO'}
		<img
			src={media.coverUrl}
			alt={media.coverAlt ?? ''}
			class="rounded-card mt-8 w-full object-cover"
		/>
	{/if}

	<!-- Le rendu suit la nature du media, via le registre. -->
	{#if media.kind === 'VIDEO' && text('embedUrl')}
		<div class="mt-8">
			<VideoEmbed embedUrl={text('embedUrl')!} title={media.title} />
			{#if text('watchUrl')}
				<p class="text-muted mt-3 text-xs">
					Hébergé par {text('providerLabel')} —
					<a
						class="underline"
						href={text('watchUrl')!}
						target="_blank"
						rel="noopener noreferrer">voir sur le site d'origine</a
					>
				</p>
			{/if}
		</div>
	{/if}

	{#if media.kind === 'PODCAST' && text('audioUrl')}
		<div class="mt-8">
			<AudioPlayer
				src={text('audioUrl')!}
				title={media.title}
				durationSeconds={number('durationSeconds')}
			/>
		</div>
	{/if}

	{#if media.body}
		<!-- `whitespace-pre-line` et non du HTML injecte : le corps est du texte, il
		     ne peut donc pas porter de script. -->
		<div class="mt-10 text-lg leading-relaxed whitespace-pre-line">{media.body}</div>
	{/if}

	{#if media.kind === 'PODCAST' && text('transcript')}
		<section class="mt-12" aria-labelledby="transcription">
			<h2 id="transcription" class="font-display text-2xl font-semibold">Transcription</h2>
			<p class="text-ink-soft mt-4 leading-relaxed whitespace-pre-line">{text('transcript')}</p>
		</section>
	{/if}

	{#if media.tags.length > 0}
		<ul class="mt-10 flex flex-wrap gap-2">
			{#each media.tags as tag (tag)}
				<li class="border-ink text-muted bg-paper rounded-pill border-2 px-3 py-1 text-xs">{tag}</li>
			{/each}
		</ul>
	{/if}
</article>

{#if data.related.length > 0}
	<section class="border-ink mx-auto max-w-6xl border-t-2 px-4 py-12 sm:px-6" aria-labelledby="suite">
		<h2 id="suite" class="font-display text-2xl font-semibold">À lire et à écouter ensuite</h2>
		<ul class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.related as item (item.slug)}
				<li><MediaCard media={item} /></li>
			{/each}
		</ul>
	</section>
{/if}
