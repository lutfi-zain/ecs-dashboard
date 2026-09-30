import { json, type RequestHandler } from '@sveltejs/kit';
import { ListSecretsCommand, CreateSecretCommand } from '@aws-sdk/client-secrets-manager';
import { createSecretsManagerClient } from '$lib/server/aws/clients.js';
import type { Secret } from '$lib/types/secrets.js';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const maxResults = Number.parseInt(url.searchParams.get('maxResults') || '100');
		const client = createSecretsManagerClient();

		const command = new ListSecretsCommand({ MaxResults: maxResults });
		const response = await client.send(command);

		const secrets: Secret[] = (response.SecretList || []).map((s) => ({
			arn: s.ARN || '',
			name: s.Name || '',
			description: s.Description,
			lastChangedDate: s.LastChangedDate?.toISOString(),
			lastAccessedDate: s.LastAccessedDate?.toISOString(),
			createdDate: s.CreatedDate?.toISOString()
		}));

		return json({ success: true, data: secrets });
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : 'Failed to list secrets';
		console.error('Error listing secrets:', error);
		return json({ success: false, error: errorMessage }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as {
			name?: string;
			value?: unknown;
			description?: string;
		};

		const { name, value, description } = body;

		if (!name || value === undefined) {
			return json(
				{ success: false, error: 'Name and value are required' },
				{ status: 400 }
			);
		}

		const secretString = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
		const client = createSecretsManagerClient();

		const command = new CreateSecretCommand({
			Name: name,
			SecretString: secretString,
			Description: description
		});

		const response = await client.send(command);

		return json({
			success: true,
			data: {
				arn: response.ARN || '',
				name: response.Name || name,
				versionId: response.VersionId || ''
			}
		});
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : 'Failed to create secret';
		console.error('Error creating secret:', error);
		return json({ success: false, error: errorMessage }, { status: 500 });
	}
};
