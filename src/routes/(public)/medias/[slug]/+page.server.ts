import { error } from '@sveltejs/kit';
import { getPublishedMedia, listRelatedMedia } from '$lib/server/media/queries';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const media = await getPublishedMedia(params.slug);
	if (!media) error(404, { message: "Ce media n'existe pas ou n'est pas encore publie." });

	return { media, related: await listRelatedMedia(params.slug) };
};
