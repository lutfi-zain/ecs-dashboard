export interface MetricDataPoint {
	timestamp: string;
	value: number;
}

export interface MetricsData {
	cpu: MetricDataPoint[];
	memory: MetricDataPoint[];
}

export interface MetricService {
	name: string;
	arn: string;
	status: string;
	runningCount: number;
	desiredCount: number;
}
