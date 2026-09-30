export interface Secret {
	arn: string;
	name: string;
	description?: string;
	lastChangedDate?: string;
	lastAccessedDate?: string;
	value?: string | Record<string, unknown>;
	versionId?: string;
	createdDate?: string;
}

export interface SecretOperationResult {
	success: boolean;
	data?: Secret | { arn: string; name: string; versionId: string };
	error?: string;
}
