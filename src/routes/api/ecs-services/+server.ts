import { json, type RequestHandler } from '@sveltejs/kit';
import { ListServicesCommand, DescribeServicesCommand } from '@aws-sdk/client-ecs';
import { createECSClient, isAllowedCluster } from '$lib/server/aws/clients.js';
import {
	servicesRateLimiter,
	getClientIdentifier,
	retryWithBackoff,
	delay
} from '$lib/server/aws/rate-limit.js';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const clientId = getClientIdentifier(request);
		const rateLimitResult = servicesRateLimiter.check(clientId);

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

		const body = (await request.json()) as { clusterName?: string };
		const clusterName = body.clusterName;

		if (!clusterName) {
			return json({ error: 'Cluster name is required' }, { status: 400 });
		}

		if (!isAllowedCluster(clusterName)) {
			return json({ error: 'Invalid cluster name' }, { status: 400 });
		}

		const ecsClient = createECSClient();
		const allServiceArns: string[] = [];
		let nextToken: string | undefined = undefined;

		do {
			const servicesResponse = await retryWithBackoff(async () =>
				ecsClient.send(
					new ListServicesCommand({
						cluster: clusterName,
						maxResults: 100,
						nextToken
					})
				)
			);

			if (servicesResponse.serviceArns) {
				allServiceArns.push(...servicesResponse.serviceArns);
			}

			nextToken = servicesResponse.nextToken;
		} while (nextToken);

		if (allServiceArns.length === 0) {
			return json({ services: [] });
		}

		const batchSize = 10;
		const allServices = [];

		for (let i = 0; i < allServiceArns.length; i += batchSize) {
			const batch = allServiceArns.slice(i, i + batchSize);
			if (i > 0) {
				await delay(100);
			}

			const serviceDetailsResponse = await retryWithBackoff(async () =>
				ecsClient.send(
					new DescribeServicesCommand({
						cluster: clusterName,
						services: batch
					})
				)
			);

			if (serviceDetailsResponse.services) {
				allServices.push(...serviceDetailsResponse.services);
			}
		}

		const services = allServices.map((service) => ({
			name: service.serviceName || '',
			arn: service.serviceArn || '',
			status: service.status || '',
			runningCount: service.runningCount || 0,
			desiredCount: service.desiredCount || 0
		}));

		services.sort((a, b) => a.name.localeCompare(b.name));

		return json({ services });
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : 'Failed to fetch services';
		console.error('Error fetching ECS services:', error);
		return json({ error: errorMessage }, { status: 500 });
	}
};
