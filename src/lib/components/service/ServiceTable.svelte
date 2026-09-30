<script lang="ts">
	import type { ServiceStatus, ServiceMetrics } from '$lib/types/ecs.js';
	import ServiceTableRow from './ServiceTableRow.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import {
		MagnifyingGlass,
		PaperPlaneRight,
		ChartBar,
		Tray
	} from 'phosphor-svelte';

	interface Props {
		services: ServiceStatus[];
		clusterName: string;
		selectedServiceNames: Set<string>;
		loadingMetricsMap?: Map<string, boolean>;
		metricsDataMap?: Map<string, ServiceMetrics>;
		onToggleSelectAll?: (checked: boolean) => void;
		onToggleSelectService?: (name: string, checked: boolean) => void;
		onTriggerForceDeploy?: () => void;
		onLoadAllMetrics?: () => void;
		onLoadServiceMetrics?: (name: string) => void;
		onOpenShellModal?: (service: ServiceStatus) => void;
	}

	let {
		services,
		clusterName,
		selectedServiceNames,
		loadingMetricsMap = new Map(),
		metricsDataMap = new Map(),
		onToggleSelectAll,
		onToggleSelectService,
		onTriggerForceDeploy,
		onLoadAllMetrics,
		onLoadServiceMetrics,
		onOpenShellModal
	}: Props = $props();

	let searchQuery = $state('');
	let statusFilter = $state<'ALL' | 'ACTIVE' | 'PENDING' | 'DEGRADED'>('ALL');

	let filteredServices = $derived.by(() => {
		return services.filter((s) => {
			if (searchQuery) {
				const query = searchQuery.toLowerCase();
				const matchesName = s.serviceName.toLowerCase().includes(query);
				const matchesTask = s.taskDefinition.toLowerCase().includes(query);
				if (!matchesName && !matchesTask) return false;
			}

			if (statusFilter === 'ACTIVE') {
				return s.status.toUpperCase() === 'ACTIVE' && s.runningCount > 0;
			}
			if (statusFilter === 'PENDING') {
				return s.pendingCount > 0;
			}
			if (statusFilter === 'DEGRADED') {
				return s.status.toUpperCase() !== 'ACTIVE' || (s.desiredCount > 0 && s.runningCount === 0);
			}

			return true;
		});
	});

	let isAllSelected = $derived(
		filteredServices.length > 0 &&
			filteredServices.every((s) => selectedServiceNames.has(s.serviceName))
	);
</script>

<div class="space-y-3">
	<!-- Control Bar: Search, Filters, Bulk Actions -->
	<div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--card)] p-3 rounded bento-card">
		<!-- Left: Search and Status Filters -->
		<div class="flex items-center gap-2 flex-1 max-w-md">
			<div class="relative w-full">
				<MagnifyingGlass weight="bold" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
				<Input
					placeholder="Search services or task definitions..."
					bind:value={searchQuery}
					class="pl-8 h-8 text-xs bg-[var(--background)] font-mono border-[var(--border)]"
				/>
			</div>

			<select
				bind:value={statusFilter}
				class="h-8 px-2.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded text-foreground shrink-0 focus:outline-none font-mono"
			>
				<option value="ALL">All Status</option>
				<option value="ACTIVE">Active (Running)</option>
				<option value="PENDING">Pending Tasks</option>
				<option value="DEGRADED">Degraded / Inactive</option>
			</select>
		</div>

		<!-- Right: Action Buttons -->
		<div class="flex items-center gap-2 self-end sm:self-auto shrink-0">
			<Button
				variant="outline"
				size="sm"
				class="h-8 px-2.5 text-xs text-foreground border-[var(--border)] bg-[var(--background)] hover:bg-[var(--muted)]"
				onclick={onLoadAllMetrics}
				title="Fetch CloudWatch metrics for running services"
			>
				<ChartBar weight="bold" class="size-3.5 mr-1.5 text-stone-500" />
				<span>Load Metrics</span>
			</Button>

			<!-- Primary Call-to-action button strictly styled to minimalist-ui (#111111 solid, white text, no drop shadows) -->
			<Button
				variant="default"
				size="sm"
				class="h-8 px-3 text-xs bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[#2F3437] dark:hover:bg-[#D5D3CE] font-medium"
				disabled={selectedServiceNames.size === 0}
				onclick={onTriggerForceDeploy}
			>
				<PaperPlaneRight weight="bold" class="size-3.5 mr-1.5" />
				<span>Force Deploy ({selectedServiceNames.size})</span>
			</Button>
		</div>
	</div>

	<!-- Table Surface (Exact 1px border #EAEAEA) -->
	<div class="rounded bento-card overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-xs border-collapse">
				<thead>
					<tr class="border-b border-[var(--border)] bg-[var(--muted)]/50 text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
						<th class="w-10 px-3 py-2.5 text-center">
							<Checkbox
								checked={isAllSelected}
								onCheckedChange={(c) => onToggleSelectAll?.(Boolean(c))}
								aria-label="Select all visible services"
							/>
						</th>
						<th class="px-3 py-2.5">Service Name</th>
						<th class="px-3 py-2.5">Status</th>
						<th class="px-3 py-2.5">Tasks</th>
						<th class="px-3 py-2.5">CPU %</th>
						<th class="px-3 py-2.5">RAM %</th>
						<th class="px-3 py-2.5">Task Definition</th>
						<th class="px-3 py-2.5">Last Deploy</th>
						<th class="px-3 py-2.5">Created</th>
						<th class="px-3 py-2.5 text-right">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#if filteredServices.length === 0}
						<tr>
							<td colspan="10" class="py-12 text-center text-muted-foreground">
								<div class="flex flex-col items-center justify-center gap-2">
									<Tray weight="bold" class="size-8 text-stone-400 opacity-60" />
									<p class="font-serif text-sm text-foreground font-medium">No services found</p>
									<p class="text-xs">
										{searchQuery || statusFilter !== 'ALL'
											? 'Try adjusting your search query or status filter.'
											: `No active services registered under ${clusterName}.`}
									</p>
								</div>
							</td>
						</tr>
					{:else}
						{#each filteredServices as service (service.serviceName)}
							<ServiceTableRow
								{service}
								selected={selectedServiceNames.has(service.serviceName)}
								loadingMetrics={loadingMetricsMap.get(service.serviceName) || false}
								metrics={metricsDataMap.get(service.serviceName)}
								onToggleSelect={(checked) =>
									onToggleSelectService?.(service.serviceName, checked)}
								onLoadMetrics={() => onLoadServiceMetrics?.(service.serviceName)}
								onOpenShell={() => onOpenShellModal?.(service)}
							/>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
