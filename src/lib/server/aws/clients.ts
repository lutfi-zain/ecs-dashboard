import { ECSClient, DescribeClustersCommand } from '@aws-sdk/client-ecs';
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { fromIni } from '@aws-sdk/credential-providers';
import type { AWSHealthStatus } from '$lib/types/ecs.js';

export const CLUSTER_NAMES = [
	'kairos-pay-cluster-ecs-iac',
	'kairos-his-cluster-ecs-iac',
	'kairos-pas-cluster-ecs-iac',
	'kairos-fe-cluster-ecs-iac'
] as const;

export type AllowedClusterName = (typeof CLUSTER_NAMES)[number];

export function isAllowedCluster(name: string): name is AllowedClusterName {
	return (CLUSTER_NAMES as readonly string[]).includes(name);
}

export function getAWSConfig() {
	const region =
		process.env.AWS_REGION ||
		process.env.AWS_DEFAULT_REGION ||
		'ap-southeast-3';

	const hasExplicitCredentials =
		process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;

	if (hasExplicitCredentials) {
		return {
			region,
			credentials: {
				accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
				secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? ''
			}
		};
	}

	return {
		region,
		credentials: fromIni()
	};
}

export function createECSClient(): ECSClient {
	const config = getAWSConfig();
	return new ECSClient(config);
}

export function createCloudWatchClient(): CloudWatchClient {
	const config = getAWSConfig();
	return new CloudWatchClient(config);
}

export function createSecretsManagerClient(): SecretsManagerClient {
	const config = getAWSConfig();
	return new SecretsManagerClient(config);
}

let cachedHealth: AWSHealthStatus | null = null;
let lastHealthCheckTime = 0;
const HEALTH_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export async function testAWSConnection(force = false): Promise<AWSHealthStatus> {
	const now = Date.now();
	if (!force && cachedHealth && now - lastHealthCheckTime < HEALTH_CACHE_TTL_MS) {
		return cachedHealth;
	}

	const config = getAWSConfig();
	const hasExplicit = Boolean(
		process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
	);
	const credentialSource = hasExplicit
		? 'Environment Variables'
		: 'AWS Credential Chain (CLI/IAM)';

	try {
		const client = createECSClient();
		await client.send(new DescribeClustersCommand({}));

		const result: AWSHealthStatus = {
			status: 'healthy',
			message: 'AWS connection successful',
			region: config.region,
			credentialSource,
			timestamp: new Date().toISOString()
		};
		cachedHealth = result;
		lastHealthCheckTime = now;
		return result;
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown AWS connection error';

		const result: AWSHealthStatus = {
			status: 'error',
			message: errorMessage,
			region: config.region,
			credentialSource,
			timestamp: new Date().toISOString()
		};
		cachedHealth = result;
		lastHealthCheckTime = now;
		return result;
	}
}
