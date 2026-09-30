import { createSecretsManagerClient } from '$lib/server/aws/clients.js';
import { ListSecretsCommand } from '@aws-sdk/client-secrets-manager';
import type { Secret } from '$lib/types/secrets.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async () => {
	try {
		const client = createSecretsManagerClient();
		const command = new ListSecretsCommand({ MaxResults: 100 });
		const response = await client.send(command);

		const secrets: Secret[] = (response.SecretList || []).map((s) => ({
			arn: s.ARN || '',
			name: s.Name || '',
			description: s.Description,
			lastChangedDate: s.LastChangedDate?.toISOString(),
			lastAccessedDate: s.LastAccessedDate?.toISOString(),
			createdDate: s.CreatedDate?.toISOString()
		}));

		return {
			secrets,
			error: null
		};
	} catch (err: unknown) {
		const errorMessage =
			err instanceof Error ? err.message : 'Failed to load secrets list from AWS Secrets Manager';
		console.error('SSR secrets load failed:', err);

		return {
			secrets: [],
			error: errorMessage
		};
	}
};
