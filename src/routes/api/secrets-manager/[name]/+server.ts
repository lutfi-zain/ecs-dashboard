import { json, type RequestHandler } from '@sveltejs/kit';
import {
	GetSecretValueCommand,
	PutSecretValueCommand,
	DeleteSecretCommand
} from '@aws-sdk/client-secrets-manager';
import { createSecretsManagerClient } from '$lib/server/aws/clients.js';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const secretName = decodeURIComponent(params.name || '');
		if (!secretName) {
			return json({ success: false, error: 'Secret name is required' }, { status: 400 });
		}

		const client = createSecretsManagerClient();
		const command = new GetSecretValueCommand({ SecretId: secretName });
		const response = await client.send(command);

		let value: string | Record<string, unknown> = response.SecretString || '';
		try {
			if (typeof response.SecretString === 'string') {
				value = JSON.parse(response.SecretString) as Record<string, unknown>;
			}
		} catch {
			// Keep as raw string if not JSON
		}

		return json({
			success: true,
			data: {
				arn: response.ARN || '',
				name: response.Name || secretName,
				versionId: response.VersionId || '',
				createdDate: response.CreatedDate?.toISOString(),
				value
			}
		});
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : 'Failed to get secret';
		console.error('Error getting secret:', error);
		return json({ success: false, error: errorMessage }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const secretName = decodeURIComponent(params.name || '');
		if (!secretName) {
			return json({ success: false, error: 'Secret name is required' }, { status: 400 });
		}

		const body = (await request.json()) as { value?: unknown };
		const { value } = body;

		if (value === undefined) {
			return json({ success: false, error: 'Value is required' }, { status: 400 });
		}

		const secretString = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
		const client = createSecretsManagerClient();

		const command = new PutSecretValueCommand({
			SecretId: secretName,
			SecretString: secretString
		});

		const response = await client.send(command);

		return json({
			success: true,
			data: {
				arn: response.ARN || '',
				name: response.Name || secretName,
				versionId: response.VersionId || ''
			}
		});
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : 'Failed to update secret';
		console.error('Error updating secret:', error);
		return json({ success: false, error: errorMessage }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const secretName = decodeURIComponent(params.name || '');
		if (!secretName) {
			return json({ success: false, error: 'Secret name is required' }, { status: 400 });
		}

		const client = createSecretsManagerClient();
		const command = new DeleteSecretCommand({
			SecretId: secretName,
			RecoveryWindowInDays: 7
		});

		const response = await client.send(command);

		return json({
			success: true,
			data: {
				arn: response.ARN || '',
				name: response.Name || secretName,
				deletionDate: response.DeletionDate?.toISOString()
			}
		});
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : 'Failed to delete secret';
		console.error('Error deleting secret:', error);
		return json({ success: false, error: errorMessage }, { status: 500 });
	}
};
