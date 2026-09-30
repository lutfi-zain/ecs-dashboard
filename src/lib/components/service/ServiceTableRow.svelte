<script lang="ts">
	import type { ServiceStatus, ServiceMetrics } from '$lib/types/ecs.js';
	import ServiceStatusBadge from './ServiceStatusBadge.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { TerminalWindow, ChartBar, CircleNotch } from 'phosphor-svelte';

	interface Props {
		service: ServiceStatus;
		selected?: boolean;
		loadingMetrics?: boolean;
		metrics?: ServiceMetrics;
		onToggleSelect?: (checked: boolean) => void;
		onLoadMetrics?: () => void;
		onOpenShell?: () => void;
	}

	let {
		service,
		selected = false,
		loadingMetrics = false,
		metrics,
		onToggleSelect,
		onLoadMetrics,
		onOpenShell
	}: Props = $props();

	function getMetricClass(valStr: string | null) {
		if (!valStr) return 'text-muted-foreground';
		const num = parseFloat(valStr);
		if (num > 80) return 'text-[var(--pastel-red-text)] font-semibold';
		if (num > 60) return 'text-[var(--pastel-yellow-text)] font-semibold';
		return 'text-[var(--pastel-green-text)] font-medium';
	}

	let cpuFormatted = $derived(
		metrics?.cpu.value !== undefined && metrics.cpu.value !== null
			? `${metrics.cpu.value}%`
			: null
	);

	let memFormatted = $derived(
		metrics?.memory.value !== undefined && metrics.memory.value !== null
			? `${metrics.memory.value}%`
			: null
	);
</script>

<tr class="border-b border-[var(--border)] transition-colors hover:bg-[var(--muted)]/40 {selected ? 'bg-[var(--muted)]/80' : ''}">
	<!-- Selection Checkbox -->
	<td class="w-10 px-3 py-3 text-center">
		<Checkbox
			checked={selected}
			onCheckedChange={(c) => onToggleSelect?.(Boolean(c))}
			aria-label="Select service {service.serviceName}"
		/>
	</td>

	<!-- Service Name -->
	<td class="px-3 py-3 font-mono text-xs font-semibold text-foreground max-w-[220px] truncate" title={service.serviceName}>
		{service.serviceName}
	</td>

	<!-- Status Badge -->
	<td class="px-3 py-3 whitespace-nowrap">
		<ServiceStatusBadge status={service.status} />
	</td>

	<!-- Tasks count -->
	<td class="px-3 py-3 whitespace-nowrap font-mono text-xs">
		<div class="flex items-center gap-1.5">
			<span class="text-foreground font-medium">{service.runningCount} / {service.desiredCount}</span>
			{#if service.pendingCount > 0}
				<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--pastel-yellow-bg)] text-[var(--pastel-yellow-text)] border border-[var(--pastel-yellow-border)] font-mono">
					+{service.pendingCount} pend
				</span>
			{/if}
		</div>
	</td>

	<!-- CPU Utilization -->
	<td class="px-3 py-3 whitespace-nowrap font-mono text-xs">
		{#if loadingMetrics}
			<CircleNotch weight="bold" class="size-3.5 animate-spin text-muted-foreground" />
		{:else if cpuFormatted}
			<span class={getMetricClass(metrics?.cpu.value || null)}>
				{cpuFormatted}
			</span>
		{:else}
			<Button
				variant="ghost"
				size="sm"
				class="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
				onclick={onLoadMetrics}
				title="Load CPU/RAM metrics"
			>
				<ChartBar weight="bold" class="size-3 mr-1" />
				Load
			</Button>
		{/if}
	</td>

	<!-- RAM Utilization -->
	<td class="px-3 py-3 whitespace-nowrap font-mono text-xs">
		{#if loadingMetrics}
			<CircleNotch weight="bold" class="size-3.5 animate-spin text-muted-foreground" />
		{:else if memFormatted}
			<span class={getMetricClass(metrics?.memory.value || null)}>
				{memFormatted}
			</span>
		{:else}
			<span class="text-stone-400 dark:text-stone-600 text-[11px]">—</span>
		{/if}
	</td>

	<!-- Task Definition -->
	<td class="px-3 py-3 font-mono text-[11px] text-muted-foreground max-w-[160px] truncate" title={service.taskDefinition}>
		{service.taskDefinition}
	</td>

	<!-- Last Deployment -->
	<td class="px-3 py-3 whitespace-nowrap text-[11px] font-mono text-muted-foreground">
		{#if service.lastDeployment?.createdAt}
			{new Date(service.lastDeployment.createdAt).toLocaleDateString()} {new Date(service.lastDeployment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
		{:else}
			—
		{/if}
	</td>

	<!-- Created Date -->
	<td class="px-3 py-3 whitespace-nowrap text-[11px] font-mono text-muted-foreground">
		{#if service.createdAt}
			{new Date(service.createdAt).toLocaleDateString()}
		{:else}
			—
		{/if}
	</td>

	<!-- Actions: Shell Connect -->
	<td class="px-3 py-3 whitespace-nowrap text-right">
		<Button
			variant="outline"
			size="sm"
			class="h-7 px-2.5 text-xs border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] text-foreground"
			onclick={onOpenShell}
			title="Generate ECS Exec connect script"
		>
			<TerminalWindow weight="bold" class="size-3 mr-1 text-stone-500" />
			<span>Shell</span>
		</Button>
	</td>
</tr>
