import { fetchAllClusterStatus } from '$lib/server/aws/ecs.js';
import { testAWSConnection } from '$lib/server/aws/clients.js';

// Background Cache Warmup on Server Initialization
// Pre-fetches AWS ECS cluster data and health status so the first user visit is instant.
(async () => {
	try {
		console.log('[Server Startup] Warming up AWS ECS cache in background...');
		await Promise.allSettled([testAWSConnection(), fetchAllClusterStatus()]);
		console.log('[Server Startup] AWS ECS cache warmup complete. Dashboard ready for instant hits.');
	} catch (err) {
		console.warn('[Server Startup] Background cache warmup skipped/failed:', err);
	}
})();
