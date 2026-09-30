import { json, type RequestHandler } from '@sveltejs/kit';
import { testAWSConnection } from '$lib/server/aws/clients.js';

export const GET: RequestHandler = async ({ url }) => {
	const force = url.searchParams.get('force') === 'true';
	try {
		const health = await testAWSConnection(force);
		const status = health.status === 'healthy' ? 200 : 500;
		return json(health, { status });
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : 'AWS health check failed';
		return json(
			{
				status: 'error',
				message,
				region: process.env.AWS_REGION || 'ap-southeast-3',
				timestamp: new Date().toISOString()
			},
			{ status: 500 }
		);
	}
};
