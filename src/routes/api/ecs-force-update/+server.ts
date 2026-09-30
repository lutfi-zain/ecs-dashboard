import { json, type RequestHandler } from '@sveltejs/kit';
import { UpdateServiceCommand } from '@aws-sdk/client-ecs';
import { createECSClient, isAllowedCluster } from '$lib/server/aws/clients.js';
import type { UpdateResult } from '$lib/types/ecs.js';

interface ForceUpdateRequest {
	clusterName: string;
	serviceNames: string[];
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as ForceUpdateRequest;
		const { clusterName, serviceNames } = body;

		if (!clusterName || !serviceNames || serviceNames.length === 0) {
			return json(
				{ error: 'Cluster name and service names are required' },
				{ status: 400 }
			);
		}

		if (!isAllowedCluster(clusterName)) {
			return json({ error: 'Invalid cluster name' }, { status: 400 });
		}

		const ecsClient = createECSClient();

		const results: UpdateResult[] = await Promise.all(
			serviceNames.map(async (serviceName) => {
				try {
					const command = new UpdateServiceCommand({
						cluster: clusterName,
						service: serviceName,
						forceNewDeployment: true
					});

					const response = await ecsClient.send(command);

					return {
						serviceName,
						success: true,
						message: `Force deployment initiated successfully (Task Definition: ${response.service?.taskDefinition?.split('/').pop()})`
					};
				} catch (error: unknown) {
					console.error(`Error updating service ${serviceName}:`, error);

					let errorMessage = 'Unknown error occurred';
					if (error instanceof Error) {
						if (error.name === 'ServiceNotFoundException') {
							errorMessage = 'Service not found';
						} else if (error.name === 'ClusterNotFoundException') {
							errorMessage = 'Cluster not found';
						} else if (error.name === 'AccessDeniedException') {
							errorMessage = 'Access denied - insufficient permissions';
						} else if (error.name === 'InvalidParameterException') {
							errorMessage = 'Invalid parameters provided';
						} else {
							errorMessage = error.message;
						}
					}

					return {
						serviceName,
						success: false,
						message: `Failed to initiate deployment: ${errorMessage}`
					};
				}
			})
		);

		return json(results);
	} catch (error: unknown) {
		console.error('Error in force update API:', error);
		const errorMessage =
			error instanceof Error ? error.message : 'Failed to process force update request';

		return json(
			{
				error: errorMessage,
				region: process.env.AWS_REGION || 'ap-southeast-3',
				timestamp: new Date().toISOString()
			},
			{ status: 500 }
		);
	}
};
