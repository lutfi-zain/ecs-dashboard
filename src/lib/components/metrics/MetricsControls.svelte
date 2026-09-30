<script lang="ts">
	import type { MetricService } from '$lib/types/metrics.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Play, CircleNotch } from 'phosphor-svelte';

	interface Props {
		clusterNames: readonly string[];
		selectedCluster: string;
		services: MetricService[];
		selectedService: string;
		loadingServices?: boolean;
		timeRange: string;
		useCustomRange: boolean;
		customStart: string;
		customEnd: string;
		metricType: 'cpu' | 'memory' | 'both';
		loadingMetrics?: boolean;
		onSelectCluster: (cluster: string) => void;
		onSelectService: (service: string) => void;
		onSelectTimeRange: (range: string) => void;
		onToggleCustomRange: (custom: boolean) => void;
		onChangeCustomStart: (val: string) => void;
		onChangeCustomEnd: (val: string) => void;
		onChangeMetricType: (type: 'cpu' | 'memory' | 'both') => void;
		onQueryMetrics: () => void;
	}

	let {
		clusterNames,
		selectedCluster,
		services,
		selectedService,
		loadingServices = false,
		timeRange,
		useCustomRange,
		customStart,
		customEnd,
		metricType,
		loadingMetrics = false,
		onSelectCluster,
		onSelectService,
		onSelectTimeRange,
		onToggleCustomRange,
		onChangeCustomStart,
		onChangeCustomEnd,
		onChangeMetricType,
		onQueryMetrics
	}: Props = $props();

	const presetRanges = [
		{ value: '0.25', label: '15m' },
		{ value: '1', label: '1h' },
		{ value: '3', label: '3h' },
		{ value: '6', label: '6h' },
		{ value: '12', label: '12h' },
		{ value: '24', label: '24h' },
		{ value: '72', label: '3d' },
		{ value: '168', label: '7d' }
	];
</script>

<div class="p-5 bento-card space-y-4">
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
		<!-- Cluster Selector -->
		<div class="space-y-1.5">
			<Label class="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
				Target Cluster
			</Label>
			<select
				class="w-full h-8 px-2.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded text-foreground focus:outline-none font-mono"
				value={selectedCluster}
				onchange={(e) => onSelectCluster(e.currentTarget.value)}
			>
				{#each clusterNames as cluster}
					<option value={cluster}>{cluster}</option>
				{/each}
			</select>
		</div>

		<!-- Service Selector -->
		<div class="space-y-1.5">
			<div class="flex items-center justify-between">
				<Label class="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
					ECS Service
				</Label>
				{#if loadingServices}
					<span class="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
						<CircleNotch weight="bold" class="size-2.5 animate-spin" />
						Loading
					</span>
				{/if}
			</div>

			<select
				class="w-full h-8 px-2.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded text-foreground focus:outline-none font-mono"
				value={selectedService}
				disabled={loadingServices || services.length === 0}
				onchange={(e) => onSelectService(e.currentTarget.value)}
			>
				<option value="">-- Choose a service ({services.length}) --</option>
				{#each services as svc}
					<option value={svc.name}>
						{svc.name} ({svc.runningCount}/{svc.desiredCount})
					</option>
				{/each}
			</select>
		</div>

		<!-- Metric Type Toggle -->
		<div class="space-y-1.5">
			<Label class="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
				Metrics Series
			</Label>
			<div class="inline-flex h-8 w-full p-0.5 rounded border border-[var(--border)] bg-[var(--muted)]/50">
				<button
					type="button"
					class="flex-1 rounded text-xs font-mono transition-all {metricType === 'both' ? 'bg-[var(--card)] text-foreground font-semibold shadow-2xs' : 'text-muted-foreground hover:text-foreground'}"
					onclick={() => onChangeMetricType('both')}
				>
					Both
				</button>
				<button
					type="button"
					class="flex-1 rounded text-xs font-mono transition-all {metricType === 'cpu' ? 'bg-[var(--card)] text-foreground font-semibold shadow-2xs' : 'text-muted-foreground hover:text-foreground'}"
					onclick={() => onChangeMetricType('cpu')}
				>
					CPU
				</button>
				<button
					type="button"
					class="flex-1 rounded text-xs font-mono transition-all {metricType === 'memory' ? 'bg-[var(--card)] text-foreground font-semibold shadow-2xs' : 'text-muted-foreground hover:text-foreground'}"
					onclick={() => onChangeMetricType('memory')}
				>
					Memory
				</button>
			</div>
		</div>

		<!-- Submit Query Button -->
		<div class="space-y-1.5">
			<Button
				variant="default"
				size="sm"
				class="w-full h-8 text-xs bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[#2F3437] font-semibold"
				disabled={!selectedService || loadingMetrics}
				onclick={onQueryMetrics}
			>
				{#if loadingMetrics}
					<CircleNotch weight="bold" class="size-3.5 mr-1.5 animate-spin" />
					Fetching Telemetry...
				{:else}
					<Play weight="fill" class="size-3 mr-1.5" />
					Query CloudWatch
				{/if}
			</Button>
		</div>
	</div>

	<!-- Time Range Controls: Presets vs Custom -->
	<div class="pt-3 border-t border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
		<div class="flex items-center gap-1.5 flex-wrap">
			<span class="text-[10px] font-mono text-muted-foreground mr-1.5 uppercase tracking-wider">Interval:</span>
			{#each presetRanges as preset}
				<button
					type="button"
					class="px-2.5 py-0.5 rounded text-xs font-mono transition-colors {!useCustomRange && timeRange === preset.value
						? 'bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold'
						: 'border border-[var(--border)] text-muted-foreground hover:bg-[var(--muted)]'}"
					onclick={() => {
						onToggleCustomRange(false);
						onSelectTimeRange(preset.value);
					}}
				>
					{preset.label}
				</button>
			{/each}

			<button
				type="button"
				class="px-2.5 py-0.5 rounded text-xs font-mono transition-colors {useCustomRange
					? 'bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold'
					: 'border border-[var(--border)] text-muted-foreground hover:bg-[var(--muted)]'}"
				onclick={() => onToggleCustomRange(!useCustomRange)}
			>
				Custom Range
			</button>
		</div>

		{#if useCustomRange}
			<div class="flex items-center gap-2 text-xs">
				<Input
					type="datetime-local"
					value={customStart}
					oninput={(e) => onChangeCustomStart(e.currentTarget.value)}
					class="h-7 text-xs font-mono w-44 bg-[var(--background)] border-[var(--border)]"
				/>
				<span class="text-muted-foreground text-xs font-mono">to</span>
				<Input
					type="datetime-local"
					value={customEnd}
					oninput={(e) => onChangeCustomEnd(e.currentTarget.value)}
					class="h-7 text-xs font-mono w-44 bg-[var(--background)] border-[var(--border)]"
				/>
			</div>
		{/if}
	</div>
</div>
