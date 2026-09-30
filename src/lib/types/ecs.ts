export interface MetricValue {
	value: string | null;
	unit: string;
	timestamp: string | null;
}

export interface ServiceMetrics {
	cpu: MetricValue;
	memory: MetricValue;
}

export interface ServiceDeployment {
	status: string;
	createdAt: string;
	taskDefinition: string;
}

export interface ServiceStatus {
	serviceName: string;
	serviceArn: string;
	status: string;
	runningCount: number;
	pendingCount: number;
	desiredCount: number;
	taskDefinition: string;
	platformVersion?: string;
	createdAt?: string;
	cpuSpec?: string | null;
	memorySpec?: string | null;
	lastDeployment?: ServiceDeployment;
	metrics?: ServiceMetrics;
}

export interface ClusterData {
	clusterName: string;
	status: string;
	activeServicesCount: number;
	runningTasksCount: number;
	pendingTasksCount: number;
	services: ServiceStatus[];
	error?: string;
}

export interface UpdateResult {
	serviceName: string;
	success: boolean;
	message: string;
}

export interface AWSHealthStatus {
	status: 'healthy' | 'error' | 'warning' | string;
	message: string;
	region: string;
	timestamp: string;
	credentialSource?: string;
}
