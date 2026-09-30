import { testAWSConnection } from '$lib/server/aws/clients.js';
import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = async () => {
	const health = await testAWSConnection();
	return {
		health
	};
};
