import { publishedBlocks } from '$lib/server/content/queries';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { blocks: await publishedBlocks('ABOUT') };
};
