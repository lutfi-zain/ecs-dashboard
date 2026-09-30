import { CLUSTER_NAMES } from '$lib/server/aws/clients.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async () => {
	return {
		clusterNames: CLUSTER_NAMES,
		defaultCluster: CLUSTER_NAMES[0]
	};
};
