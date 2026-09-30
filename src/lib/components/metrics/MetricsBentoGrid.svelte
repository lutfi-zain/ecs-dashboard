<script lang="ts">
	import type { MetricsData } from '$lib/types/metrics.js';
	import MetricCard from './MetricCard.svelte';

	interface Props {
		metrics: MetricsData | null;
		metricType: 'cpu' | 'memory' | 'both';
	}

	let { metrics, metricType }: Props = $props();

	const cpuData = $derived(metrics?.cpu || []);
	const memData = $derived(metrics?.memory || []);
</script>

<div class="space-y-4">
	{#if metricType === 'both'}
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
			<MetricCard
				title="CPU Utilization"
				data={cpuData}
				strokeColor="#346538"
				fillColor="#EDF3EC"
			/>
			<MetricCard
				title="Memory Utilization"
				data={memData}
				strokeColor="#1F6C9F"
				fillColor="#E1F3FE"
			/>
		</div>
	{:else if metricType === 'cpu'}
		<MetricCard
			title="CPU Utilization"
			data={cpuData}
			strokeColor="#346538"
			fillColor="#EDF3EC"
		/>
	{:else}
		<MetricCard
			title="Memory Utilization"
			data={memData}
			strokeColor="#1F6C9F"
			fillColor="#E1F3FE"
		/>
	{/if}
</div>
