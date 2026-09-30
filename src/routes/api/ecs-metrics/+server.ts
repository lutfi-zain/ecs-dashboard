import { json, type RequestHandler } from '@sveltejs/kit';
import { GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch';
import { createCloudWatchClient, isAllowedCluster } from '$lib/server/aws/clients.js';
import type { ServiceMetrics } from '$lib/types/ecs.js';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { clusterName, serviceName } = (await request.json()) as {
			clusterName?: string;
			serviceName?: string;
		};

		if (!clusterName || !serviceName) {
			return json(
				{ error: 'clusterName and serviceName are required' },
				{ status: 400 }
			);
		}

		if (!isAllowedCluster(clusterName)) {
			return json({ error: 'Invalid cluster name' }, { status: 400 });
		}

		const cloudWatchClient = createCloudWatchClient();
		const endTime = new Date();
		const startTime = new Date(endTime.getTime() - 5 * 60 * 1000); // Last 5 minutes

		const cpuCommand = new GetMetricStatisticsCommand({
			Namespace: 'AWS/ECS',
			MetricName: 'CPUUtilization',
			Dimensions: [
				{ Name: 'ClusterName', Value: clusterName },
				{ Name: 'ServiceName', Value: serviceName }
			],
			StartTime: startTime,
			EndTime: endTime,
			Period: 60,
			Statistics: ['Average'],
			Unit: 'Percent'
		});

		const memoryCommand = new GetMetricStatisticsCommand({
			Namespace: 'AWS/ECS',
			MetricName: 'MemoryUtilization',
			Dimensions: [
				{ Name: 'ClusterName', Value: clusterName },
				{ Name: 'ServiceName', Value: serviceName }
			],
			StartTime: startTime,
			EndTime: endTime,
			Period: 60,
			Statistics: ['Average'],
			Unit: 'Percent'
		});

		const [cpuResponse, memoryResponse] = await Promise.all([
			cloudWatchClient.send(cpuCommand),
			cloudWatchClient.send(memoryCommand)
		]);

		const cpuDatapoints = cpuResponse.Datapoints || [];
		const memoryDatapoints = memoryResponse.Datapoints || [];

		// Sort by timestamp descending
		cpuDatapoints.sort((a, b) => (b.Timestamp?.getTime() || 0) - (a.Timestamp?.getTime() || 0));
		memoryDatapoints.sort((a, b) => (b.Timestamp?.getTime() || 0) - (a.Timestamp?.getTime() || 0));

		const cpuLatest = cpuDatapoints[0];
		const memoryLatest = memoryDatapoints[0];

		const metrics: ServiceMetrics = {
			cpu: {
				value: cpuLatest?.Average !== undefined ? cpuLatest.Average.toFixed(1) : null,
				unit: '%',
				timestamp: cpuLatest?.Timestamp?.toISOString() || null
			},
			memory: {
				value: memoryLatest?.Average !== undefined ? memoryLatest.Average.toFixed(1) : null,
				unit: '%',
				timestamp: memoryLatest?.Timestamp?.toISOString() || null
			}
		};

		return json(metrics);
	} catch (error: unknown) {
		console.error('Error fetching ECS metrics:', error);
		const errorMessage = error instanceof Error ? error.message : 'Failed to fetch metrics';
		return json({ error: errorMessage }, { status: 500 });
	}
};
