<script lang="ts">
	import type { MetricDataPoint } from '$lib/types/metrics.js';
	import { LayerCake, Svg, Html } from 'layercake';
	import AxisX from './AxisX.svelte';
	import AxisY from './AxisY.svelte';
	import AreaLine from './AreaLine.svelte';
	import ChartTooltip from './ChartTooltip.svelte';
	import { Pulse, WarningCircle } from 'phosphor-svelte';

	interface Props {
		title: string;
		data: MetricDataPoint[];
		strokeColor?: string;
		fillColor?: string;
		unit?: string;
	}

	let {
		title,
		data,
		strokeColor = '#346538',
		fillColor = '#346538',
		unit = '%'
	}: Props = $props();

	let chartData = $derived(
		data.map((d) => ({
			timestamp: new Date(d.timestamp),
			value: d.value
		}))
	);

	let latestValue = $derived(
		data.length > 0 ? data[data.length - 1].value : null
	);

	let avgValue = $derived.by(() => {
		if (data.length === 0) return null;
		const sum = data.reduce((acc, d) => acc + d.value, 0);
		return (sum / data.length).toFixed(1);
	});

	let maxValue = $derived.by(() => {
		if (data.length === 0) return null;
		return Math.max(...data.map((d) => d.value)).toFixed(1);
	});
</script>

<div class="p-5 bento-card space-y-4">
	<!-- Card Header: Title & KPI Stats -->
	<div class="flex items-center justify-between">
		<div>
			<h3 class="font-serif font-semibold text-base text-foreground flex items-center gap-2">
				<Pulse weight="bold" class="size-4" style="color: {strokeColor};" />
				{title}
			</h3>
			<p class="text-[10px] font-mono text-muted-foreground mt-0.5 uppercase tracking-wider">
				CloudWatch ECS Service Telemetry
			</p>
		</div>

		<!-- KPIs with Geist Mono typography -->
		<div class="flex items-center gap-4 text-right font-mono">
			{#if latestValue !== null}
				<div>
					<div class="text-[10px] text-muted-foreground uppercase tracking-wider">Latest</div>
					<div class="text-sm font-semibold text-foreground">{latestValue}{unit}</div>
				</div>
			{/if}
			{#if avgValue !== null}
				<div>
					<div class="text-[10px] text-muted-foreground uppercase tracking-wider">Average</div>
					<div class="text-sm font-medium text-muted-foreground">{avgValue}{unit}</div>
				</div>
			{/if}
			{#if maxValue !== null}
				<div>
					<div class="text-[10px] text-muted-foreground uppercase tracking-wider">Peak</div>
					<div class="text-sm font-medium text-foreground">{maxValue}{unit}</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Chart Area with exact 1px border guidelines -->
	<div class="h-64 w-full relative">
		{#if chartData.length === 0}
			<div class="h-full flex flex-col items-center justify-center rounded border border-dashed border-[var(--border)] bg-[var(--background)]/60 text-muted-foreground">
				<WarningCircle weight="bold" class="size-6 text-stone-400 mb-1" />
				<span class="text-xs font-serif font-medium">No metric telemetry recorded</span>
				<span class="text-[10px] font-mono opacity-80">Zero datapoints returned for the selected time range.</span>
			</div>
		{:else}
			<LayerCake
				padding={{ top: 8, right: 12, bottom: 24, left: 32 }}
				x="timestamp"
				y="value"
				yDomain={[0, 100]}
				data={chartData}
			>
				<Svg>
					<AxisX />
					<AxisY />
					<AreaLine {strokeColor} {fillColor} />
				</Svg>

				<Html>
					<ChartTooltip {title} {unit} />
				</Html>
			</LayerCake>
		{/if}
	</div>
</div>
