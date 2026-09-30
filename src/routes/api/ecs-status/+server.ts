import { json, type RequestHandler } from '@sveltejs/kit';
import { fetchAllClusterStatus } from '$lib/server/aws/ecs.js';

export const GET: RequestHandler = async ({ url }) => {
	const force = url.searchParams.get('force') === 'true';
	try {
		const clusterData = await fetchAllClusterStatus(force);
		return json(clusterData);
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : 'Failed to fetch ECS status';
		console.error('Error in ecs-status endpoint:', error);
		return json({ error: errorMessage }, { status: 500 });
	}
};
