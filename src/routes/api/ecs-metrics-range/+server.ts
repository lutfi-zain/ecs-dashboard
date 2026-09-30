import { json, type RequestHandler } from '@sveltejs/kit';
import { GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch';
import { createCloudWatchClient, isAllowedCluster } from '$lib/server/aws/clients.js';
import {
	metricsRateLimiter,
	getClientIdentifier,
	validateTimeRange,
	validateInput
} from '$lib/server/aws/rate-limit.js';
import type { MetricsData, MetricDataPoint } from '$lib/types/metrics.js';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const clientId = getClientIdentifier(request);
		const rateLimitResult = metricsRateLimiter.check(clientId);

		if (!rateLimitResult.allowed) {
			return json(
				{
					error: rateLimitResult.blockUntil
						? `Too many requests. Blocked until ${new Date(rateLimitResult.blockUntil).toLocaleString()}`
						: `Rate limit exceeded. Try again after ${new Date(rateLimitResult.resetTime!).toLocaleString()}`,
					resetTime: rateLimitResult.resetTime,
					blockUntil: rateLimitResult.blockUntil
				},
				{
					status: 429,
					headers: {
						'Retry-After': rateLimitResult.blockUntil
							? Math.ceil((rateLimitResult.blockUntil - Date.now()) / 1000).toString()
							: '60'
					}
				}
			);
		}

		const body = (await request.json()) as {
			clusterName?: string;
			serviceName?: string;
			startTime?: string;
			endTime?: string;
			metricType?: 'cpu' | 'memory' | 'both';
		};

		const { clusterName, serviceName, startTime: startStr, endTime: endStr, metricType = 'both' } = body;

		if (!clusterName || !serviceName || !startStr || !endStr) {
			return json(
				{ error: 'clusterName, serviceName, startTime, and endTime are required' },
				{ status: 400 }
			);
		}

		if (!isAllowedCluster(clusterName)) {
			return json({ error: 'Invalid cluster name' }, { status: 400 });
		}

		const serviceValidation = validateInput(serviceName, 255);
		if (!serviceValidation.valid) {
			return json(
				{ error: `Invalid service name: ${serviceValidation.error}` },
				{ status: 400 }
			);
		}

		if (!['cpu', 'memory', 'both'].includes(metricType)) {
			return json(
				{ error: "Invalid metric type. Must be 'cpu', 'memory', or 'both'" },
				{ status: 400 }
			);
		}

		const startDate = new Date(startStr);
		const endDate = new Date(endStr);

		// Validate max 7 days
		const timeValidation = validateTimeRange(startDate, endDate, 7);
		if (!timeValidation.valid) {
			return json({ error: timeValidation.error }, { status: 400 });
		}

		const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
		let period = 60; // 1 minute
		if (durationHours > 24 * 3) {
			period = 3600; // 1 hour for > 3 days
		} else if (durationHours > 24) {
			period = 900; // 15 minutes for > 24 hours
		} else if (durationHours > 6) {
			period = 300; // 5 minutes for > 6 hours
		}

		const cloudWatchClient = createCloudWatchClient();

		const fetchMetric = async (metricName: string): Promise<MetricDataPoint[]> => {
			const command = new GetMetricStatisticsCommand({
				Namespace: 'AWS/ECS',
				MetricName: metricName,
				Dimensions: [
					{ Name: 'ClusterName', Value: clusterName },
					{ Name: 'ServiceName', Value: serviceName }
				],
				StartTime: startDate,
				EndTime: endDate,
				Period: period,
				Statistics: ['Average'],
				Unit: 'Percent'
			});

			const response = await cloudWatchClient.send(command);
			const datapoints = response.Datapoints || [];

			datapoints.sort((a, b) => (a.Timestamp?.getTime() || 0) - (b.Timestamp?.getTime() || 0));

			return datapoints.map((dp) => ({
				timestamp: dp.Timestamp?.toISOString() || '',
				value: dp.Average !== undefined ? Number(dp.Average.toFixed(2)) : 0
			}));
		};

		let cpuData: MetricDataPoint[] = [];
		let memoryData: MetricDataPoint[] = [];

		if (metricType === 'cpu' || metricType === 'both') {
			cpuData = await fetchMetric('CPUUtilization');
		}

		if (metricType === 'memory' || metricType === 'both') {
			memoryData = await fetchMetric('MemoryUtilization');
		}

		const result: MetricsData = {
			cpu: cpuData,
			memory: memoryData
		};

		return json(result);
	} catch (error: unknown) {
		console.error('Error fetching metrics range:', error);
		const errorMessage = error instanceof Error ? error.message : 'Failed to fetch metrics';
		return json({ error: errorMessage }, { status: 500 });
	}
};
