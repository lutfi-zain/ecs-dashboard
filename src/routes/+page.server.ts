import { fetchAllClusterStatus } from '$lib/server/aws/ecs.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async () => {
	try {
		// fetchAllClusterStatus uses in-memory cache if available (<0.1ms),
		// or fetches fresh data from AWS.
		const clusters = await fetchAllClusterStatus();
		return {
			clusters,
			error: null
		};
	} catch (err: unknown) {
		const errorMessage =
			err instanceof Error ? err.message : 'Failed to fetch cluster status during initial load';
		console.error('SSR cluster load failed:', err);

		return {
			clusters: [],
			error: errorMessage
		};
	}
};
