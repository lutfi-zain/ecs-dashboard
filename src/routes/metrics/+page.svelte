<script lang="ts">
	import type { PageData } from './$types.js';
	import type { MetricService, MetricsData } from '$lib/types/metrics.js';
	import MetricsControls from '$lib/components/metrics/MetricsControls.svelte';
	import MetricsBentoGrid from '$lib/components/metrics/MetricsBentoGrid.svelte';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
	import { WarningCircle } from 'phosphor-svelte';
	import { onMount } from 'svelte';

	let { data }: { data: PageData } = $props();

	// State
	let selectedCluster = $state<string>('kairos-pay-cluster-ecs-iac');
	let services = $state<MetricService[]>([]);
	let selectedService = $state('');
	let loadingServices = $state(false);

	let timeRange = $state('1'); // 1 hour default
	let useCustomRange = $state(false);
	let customStart = $state('');
	let customEnd = $state('');

	let metricType = $state<'cpu' | 'memory' | 'both'>('both');
	let loadingMetrics = $state(false);
	let metricsData = $state<MetricsData | null>(null);
	let errorMessage = $state<string | null>(null);

	$effect(() => {
		if (data.defaultCluster && selectedCluster === 'kairos-pay-cluster-ecs-iac') {
			selectedCluster = data.defaultCluster;
		}
	});

	async function fetchServices(clusterName: string) {
		loadingServices = true;
		errorMessage = null;

		try {
			const res = await fetch('/api/ecs-services', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ clusterName })
			});

			if (res.ok) {
				const json = (await res.json()) as { services: MetricService[] };
				services = json.services || [];
				if (services.length > 0 && !services.some((s) => s.name === selectedService)) {
					selectedService = services[0].name;
					queryMetrics();
				}
			} else {
				const err = (await res.json()) as { error?: string };
				errorMessage = err.error || 'Failed to fetch cluster services';
				services = [];
				selectedService = '';
			}
		} catch (err: unknown) {
			errorMessage = err instanceof Error ? err.message : 'Error fetching services';
			services = [];
			selectedService = '';
		} finally {
			loadingServices = false;
		}
	}

	async function queryMetrics() {
		if (!selectedService) {
			errorMessage = 'Please select an ECS service to query metrics.';
			return;
		}

		errorMessage = null;
		loadingMetrics = true;

		let start: string;
		let end: string;

		if (useCustomRange) {
			if (!customStart || !customEnd) {
				errorMessage = 'Please provide both start and end dates for the custom time range.';
				loadingMetrics = false;
				return;
			}

			const startDate = new Date(customStart);
			const endDate = new Date(customEnd);

			if (startDate >= endDate) {
				errorMessage = 'Start time must be chronologically earlier than end time.';
				loadingMetrics = false;
				return;
			}

			const diffDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
			if (diffDays > 7) {
				errorMessage = 'Time range duration cannot exceed 7 days.';
				loadingMetrics = false;
				return;
			}

			start = startDate.toISOString();
			end = endDate.toISOString();
		} else {
			const hours = parseFloat(timeRange);
			const endDate = new Date();
			const startDate = new Date(endDate.getTime() - hours * 60 * 60 * 1000);
			start = startDate.toISOString();
			end = endDate.toISOString();
		}

		try {
			const res = await fetch('/api/ecs-metrics-range', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					clusterName: selectedCluster,
					serviceName: selectedService,
					startTime: start,
					endTime: end,
					metricType
				})
			});

			if (res.ok) {
				const result = (await res.json()) as MetricsData;
				metricsData = result;
			} else {
				const err = (await res.json()) as { error?: string };
				errorMessage = err.error || 'Failed to query CloudWatch metrics';
			}
		} catch (err: unknown) {
			errorMessage = err instanceof Error ? err.message : 'Network error querying metrics';
		} finally {
			loadingMetrics = false;
		}
	}

	function handleClusterChange(clusterName: string) {
		selectedCluster = clusterName;
		selectedService = '';
		metricsData = null;
		fetchServices(clusterName);
	}

	function handleServiceChange(serviceName: string) {
		selectedService = serviceName;
		if (serviceName) {
			queryMetrics();
		}
	}

	onMount(() => {
		fetchServices(selectedCluster);

		const onGlobalRefresh = () => {
			if (selectedService) {
				queryMetrics();
			}
		};

		window.addEventListener('app:refresh', onGlobalRefresh);
		return () => {
			window.removeEventListener('app:refresh', onGlobalRefresh);
		};
	});
</script>

<svelte:head>
	<title>ECS Service Metrics Explorer</title>
</svelte:head>

<div class="space-y-6">
	<!-- Error Notice if any -->
	{#if errorMessage}
		<Alert variant="destructive" class="border border-[var(--pastel-red-border)] bg-[var(--pastel-red-bg)] text-[var(--pastel-red-text)]">
			<WarningCircle weight="bold" class="size-4" />
			<AlertTitle class="font-serif">Telemetry Notice</AlertTitle>
			<AlertDescription class="text-xs font-mono">
				{errorMessage}
			</AlertDescription>
		</Alert>
	{/if}

	<!-- Controls Section -->
	<MetricsControls
		clusterNames={data.clusterNames}
		{selectedCluster}
		{services}
		{selectedService}
		{loadingServices}
		{timeRange}
		{useCustomRange}
		{customStart}
		{customEnd}
		{metricType}
		{loadingMetrics}
		onSelectCluster={handleClusterChange}
		onSelectService={handleServiceChange}
		onSelectTimeRange={(r) => {
			timeRange = r;
			if (selectedService) queryMetrics();
		}}
		onToggleCustomRange={(c) => (useCustomRange = c)}
		onChangeCustomStart={(v) => (customStart = v)}
		onChangeCustomEnd={(v) => (customEnd = v)}
		onChangeMetricType={(t) => (metricType = t)}
		onQueryMetrics={queryMetrics}
	/>

	<!-- Charts Area -->
	<MetricsBentoGrid metrics={metricsData} {metricType} />
</div>
