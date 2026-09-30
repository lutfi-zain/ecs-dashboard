<script lang="ts">
	import type { PageData } from './$types.js';
	import type { ClusterData, ServiceStatus, ServiceMetrics, UpdateResult } from '$lib/types/ecs.js';
	import ClusterStatsOverview from '$lib/components/cluster/ClusterStatsOverview.svelte';
	import ServiceTable from '$lib/components/service/ServiceTable.svelte';
	import ForceDeployDialog from '$lib/components/service/ForceDeployDialog.svelte';
	import ShellConnectModal from '$lib/components/service/ShellConnectModal.svelte';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
	import { WarningCircle } from 'phosphor-svelte';
	import { onMount } from 'svelte';

	let { data }: { data: PageData } = $props();

	// Client state
	let clientClusters = $state<ClusterData[] | null>(null);
	let clusters = $derived(clientClusters ?? data.clusters);

	let clientError = $state<string | null>(null);
	let errorState = $derived(clientError ?? data.error);

	let selectedClusterName = $state('kairos-pay-cluster-ecs-iac');
	let selectedServiceNames = $state<Set<string>>(new Set());

	$effect(() => {
		if (data.clusters.length > 0 && !clientClusters) {
			const hasCurrent = data.clusters.some((c) => c.clusterName === selectedClusterName);
			if (!hasCurrent && data.clusters[0]?.clusterName) {
				selectedClusterName = data.clusters[0].clusterName;
			}
		}
	});

	// Metrics state
	let loadingMetricsMap = $state<Map<string, boolean>>(new Map());
	let metricsDataMap = $state<Map<string, ServiceMetrics>>(new Map());

	// Modals state
	let forceDeployOpen = $state(false);
	let isDeploying = $state(false);
	let deployResults = $state<UpdateResult[] | null>(null);

	let shellModalOpen = $state(false);
	let selectedShellService = $state<ServiceStatus | null>(null);

	let currentCluster = $derived(
		clusters.find((c) => c.clusterName === selectedClusterName) || clusters[0]
	);

	let currentServices = $derived(currentCluster?.services || []);

	function handleSelectCluster(name: string) {
		selectedClusterName = name;
		selectedServiceNames = new Set();
	}

	function handleToggleSelectService(serviceName: string, checked: boolean) {
		const next = new Set(selectedServiceNames);
		if (checked) {
			next.add(serviceName);
		} else {
			next.delete(serviceName);
		}
		selectedServiceNames = next;
	}

	function handleToggleSelectAll(checked: boolean) {
		if (checked) {
			selectedServiceNames = new Set(currentServices.map((s) => s.serviceName));
		} else {
			selectedServiceNames = new Set();
		}
	}

	async function handleRefreshClusters() {
		try {
			const res = await fetch('/api/ecs-status?force=true');
			if (!res.ok) {
				throw new Error(`Failed to refresh ECS status: HTTP ${res.status}`);
			}
			const fresh = (await res.json()) as ClusterData[];
			clientClusters = fresh;
			clientError = null;
		} catch (err: unknown) {
			console.error('Refresh error:', err);
			clientError = err instanceof Error ? err.message : 'Failed to refresh cluster data';
		}
	}

	async function handleLoadServiceMetrics(serviceName: string) {
		const nextLoading = new Map(loadingMetricsMap);
		nextLoading.set(serviceName, true);
		loadingMetricsMap = nextLoading;

		try {
			const res = await fetch('/api/ecs-metrics', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					clusterName: selectedClusterName,
					serviceName
				})
			});

			if (res.ok) {
				const metrics = (await res.json()) as ServiceMetrics;
				const nextData = new Map(metricsDataMap);
				nextData.set(serviceName, metrics);
				metricsDataMap = nextData;
			}
		} catch (err) {
			console.error(`Failed to load metrics for ${serviceName}:`, err);
		} finally {
			const nextLoading = new Map(loadingMetricsMap);
			nextLoading.set(serviceName, false);
			loadingMetricsMap = nextLoading;
		}
	}

	async function handleLoadAllMetrics() {
		const runningServices = currentServices.filter((s) => s.runningCount > 0);
		await Promise.all(
			runningServices.map((s) => handleLoadServiceMetrics(s.serviceName))
		);
	}

	function handleOpenForceDeploy() {
		deployResults = null;
		forceDeployOpen = true;
	}

	async function handleExecuteForceDeploy() {
		isDeploying = true;
		deployResults = null;

		try {
			const res = await fetch('/api/ecs-force-update', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					clusterName: selectedClusterName,
					serviceNames: Array.from(selectedServiceNames)
				})
			});

			if (res.ok) {
				const results = (await res.json()) as UpdateResult[];
				deployResults = results;
				setTimeout(handleRefreshClusters, 1500);
			} else {
				const errData = (await res.json()) as { error?: string };
				deployResults = Array.from(selectedServiceNames).map((name) => ({
					serviceName: name,
					success: false,
					message: errData.error || 'Deployment request failed'
				}));
			}
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Deployment failed';
			deployResults = Array.from(selectedServiceNames).map((name) => ({
				serviceName: name,
				success: false,
				message
			}));
		} finally {
			isDeploying = false;
		}
	}

	function handleOpenShell(service: ServiceStatus) {
		selectedShellService = service;
		shellModalOpen = true;
	}

	onMount(() => {
		const onGlobalRefresh = () => {
			handleRefreshClusters();
		};
		window.addEventListener('app:refresh', onGlobalRefresh);
		return () => {
			window.removeEventListener('app:refresh', onGlobalRefresh);
		};
	});
</script>

<svelte:head>
	<title>ECS Cluster Console</title>
</svelte:head>

<div class="space-y-6">
	<!-- Error Notice if any -->
	{#if errorState}
		<Alert variant="destructive" class="border border-[var(--pastel-red-border)] bg-[var(--pastel-red-bg)] text-[var(--pastel-red-text)]">
			<WarningCircle weight="bold" class="size-4" />
			<AlertTitle class="font-serif">Cluster Communication Notice</AlertTitle>
			<AlertDescription class="text-xs font-mono">
				{errorState}
			</AlertDescription>
		</Alert>
	{/if}

	<!-- Asymmetrical Operational Console Ribbon -->
	<ClusterStatsOverview
		{clusters}
		{selectedClusterName}
		onSelectCluster={handleSelectCluster}
	/>

	<!-- Services Workbench Section -->
	<section class="space-y-3">
		<div class="flex items-center justify-between">
			<h2 class="font-serif text-xl font-semibold text-foreground tracking-tight">
				Services Workbench
			</h2>
			<span class="text-xs font-mono text-muted-foreground tabular-nums">
				Showing {currentServices.length} registered services
			</span>
		</div>

		<ServiceTable
			services={currentServices}
			clusterName={selectedClusterName}
			{selectedServiceNames}
			{loadingMetricsMap}
			{metricsDataMap}
			onToggleSelectAll={handleToggleSelectAll}
			onToggleSelectService={handleToggleSelectService}
			onTriggerForceDeploy={handleOpenForceDeploy}
			onLoadAllMetrics={handleLoadAllMetrics}
			onLoadServiceMetrics={handleLoadServiceMetrics}
			onOpenShellModal={handleOpenShell}
		/>
	</section>
</div>

<!-- Force Deployment Modal -->
<ForceDeployDialog
	bind:open={forceDeployOpen}
	clusterName={selectedClusterName}
	serviceNames={Array.from(selectedServiceNames)}
	deploying={isDeploying}
	results={deployResults}
	onConfirm={handleExecuteForceDeploy}
	onClose={() => {
		if (deployResults?.some((r) => r.success)) {
			selectedServiceNames = new Set();
		}
	}}
/>

<!-- Shell Connect Modal -->
<ShellConnectModal
	bind:open={shellModalOpen}
	service={selectedShellService}
	clusterName={selectedClusterName}
	onClose={() => (selectedShellService = null)}
/>
