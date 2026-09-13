import { listPublishedSurveys } from '$lib/server/survey/queries';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { surveys: await listPublishedSurveys() };
};
