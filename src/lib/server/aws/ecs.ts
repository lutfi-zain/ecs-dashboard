import {
	DescribeClustersCommand,
	ListServicesCommand,
	DescribeServicesCommand,
	DescribeTaskDefinitionCommand,
	type ECSClient
} from '@aws-sdk/client-ecs';
import { createECSClient, CLUSTER_NAMES } from './clients.js';
import { retryWithBackoff, delay, taskDefLimiter } from './rate-limit.js';
import type { ClusterData, ServiceStatus } from '$lib/types/ecs.js';

// In-Memory Immutable Task Definition Cache (AWS Task Definitions are immutable revisions)
const taskDefSpecsCache = new Map<string, { cpuSpec: string | null; memorySpec: string | null }>();

// Server In-Memory SWR Cache for Cluster Status (TTL: 60 seconds)
let cachedClusterData: ClusterData[] | null = null;
let lastClusterFetchTime = 0;
const CLUSTER_CACHE_TTL_MS = 60 * 1000;

async function fetchTaskDefinitionSpecs(
	ecsClient: ECSClient,
	taskDefinition: string
): Promise<{ cpuSpec: string | null; memorySpec: string | null }> {
	// 1. Instant Cache Hit (0ms)
	const cached = taskDefSpecsCache.get(taskDefinition);
	if (cached) {
		return cached;
	}

	await taskDefLimiter.acquire();

	try {
		const specs = await retryWithBackoff(async () => {
			const taskDefResponse = await ecsClient.send(
				new DescribeTaskDefinitionCommand({
					taskDefinition
				})
			);

			const taskDef = taskDefResponse.taskDefinition;
			if (!taskDef) {
				return { cpuSpec: null, memorySpec: null };
			}

			let cpuSpec = taskDef.cpu || null;
			let memorySpec = taskDef.memory || null;

			if (!cpuSpec && taskDef.containerDefinitions) {
				const totalCpu = taskDef.containerDefinitions.reduce(
					(sum, container) => sum + (container.cpu || 0),
					0
				);
				cpuSpec = totalCpu > 0 ? totalCpu.toString() : null;
			}

			if (!memorySpec && taskDef.containerDefinitions) {
				const totalMemory = taskDef.containerDefinitions.reduce(
					(sum, container) => sum + (container.memory || container.memoryReservation || 0),
					0
				);
				memorySpec = totalMemory > 0 ? totalMemory.toString() : null;
			}

			return { cpuSpec, memorySpec };
		});

		taskDefSpecsCache.set(taskDefinition, specs);
		return specs;
	} finally {
		taskDefLimiter.release();
	}
}

export async function fetchAllClusterStatus(forceRefresh = false): Promise<ClusterData[]> {
	const now = Date.now();

	// Return cached data immediately if fresh and not forcing refresh (<0.1ms)
	if (!forceRefresh && cachedClusterData && now - lastClusterFetchTime < CLUSTER_CACHE_TTL_MS) {
		return cachedClusterData;
	}

	const ecsClient = createECSClient();

	const clusterData = await Promise.all(
		CLUSTER_NAMES.map(async (clusterName, index) => {
			if (index > 0) {
				await delay(index * 50);
			}

			try {
				const clusterResponse = await retryWithBackoff(async () =>
					ecsClient.send(
						new DescribeClustersCommand({
							clusters: [clusterName],
							include: ['STATISTICS']
						})
					)
				);

				const cluster = clusterResponse.clusters?.[0];
				if (!cluster) {
					return {
						clusterName,
						status: 'not-found',
						activeServicesCount: 0,
						runningTasksCount: 0,
						pendingTasksCount: 0,
						services: [],
						error: `Cluster ${clusterName} not found`
					};
				}

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

				let services: ServiceStatus[] = [];
				if (allServiceArns.length > 0) {
					const batchSize = 10;
					const serviceBatches: string[][] = [];

					for (let i = 0; i < allServiceArns.length; i += batchSize) {
						serviceBatches.push(allServiceArns.slice(i, i + batchSize));
					}

					const allServiceDetails = [];
					for (let batchIndex = 0; batchIndex < serviceBatches.length; batchIndex++) {
						const batch = serviceBatches[batchIndex];

						if (batchIndex > 0) {
							await delay(50);
						}

						const serviceDetailsResponse = await retryWithBackoff(async () =>
							ecsClient.send(
								new DescribeServicesCommand({
									cluster: clusterName,
									services: batch
								})
							)
						);
						allServiceDetails.push(serviceDetailsResponse.services || []);
					}

					const flattenedServices = allServiceDetails.flat();

					services = await Promise.all(
						flattenedServices.map(async (service) => {
							let cpuSpec: string | null = null;
							let memorySpec: string | null = null;

							try {
								if (service.taskDefinition) {
									const specs = await fetchTaskDefinitionSpecs(
										ecsClient,
										service.taskDefinition
									);
									cpuSpec = specs.cpuSpec;
									memorySpec = specs.memorySpec;
								}
							} catch (err: unknown) {
								console.error(`Error fetching task definition for ${service.serviceName}:`, err);
							}

							const primaryDeployment = service.deployments?.[0];

							return {
								serviceName: service.serviceName || 'Unknown',
								serviceArn: service.serviceArn || '',
								status: service.status || 'Unknown',
								runningCount: service.runningCount || 0,
								pendingCount: service.pendingCount || 0,
								desiredCount: service.desiredCount || 0,
								taskDefinition: service.taskDefinition?.split('/').pop() || 'Unknown',
								platformVersion: service.platformVersion,
								createdAt: service.createdAt?.toISOString(),
								cpuSpec,
								memorySpec,
								lastDeployment: primaryDeployment
									? {
											status: primaryDeployment.status || 'Unknown',
											createdAt: primaryDeployment.createdAt?.toISOString() || '',
											taskDefinition: primaryDeployment.taskDefinition?.split('/').pop() || ''
										}
									: undefined
							};
						})
					);
				}

				return {
					clusterName,
					status: cluster.status || 'UNKNOWN',
					activeServicesCount: cluster.activeServicesCount || 0,
					runningTasksCount: cluster.runningTasksCount || 0,
					pendingTasksCount: cluster.pendingTasksCount || 0,
					services
				};
			} catch (error: unknown) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown cluster error';
				console.error(`Error processing cluster ${clusterName}:`, error);

				return {
					clusterName,
					status: 'ERROR',
					activeServicesCount: 0,
					runningTasksCount: 0,
					pendingTasksCount: 0,
					services: [],
					error: errorMessage
				};
			}
		})
	);

	// Update in-memory cache
	cachedClusterData = clusterData;
	lastClusterFetchTime = Date.now();

	return clusterData;
}
