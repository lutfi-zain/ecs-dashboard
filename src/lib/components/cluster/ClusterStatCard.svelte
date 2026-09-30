<script lang="ts">
	import type { ClusterData } from '$lib/types/ecs.js';
	import { CheckCircle, WarningCircle, CircleDashed } from 'phosphor-svelte';

	interface Props {
		cluster: ClusterData;
		selected?: boolean;
		onclick?: () => void;
	}

	let { cluster, selected = false, onclick }: Props = $props();

	let shortName = $derived.by(() => {
		const match = cluster.clusterName.match(/kairos-([a-z]+)-cluster/);
		if (match) {
			return `${match[1].toUpperCase()} Cluster`;
		}
		if (cluster.clusterName.includes('fe-cluster')) {
			return 'FE Cluster';
		}
		return cluster.clusterName.replace('-cluster-ecs-iac', '');
	});

	let isActive = $derived(cluster.status === 'ACTIVE');
	let hasPending = $derived(cluster.pendingTasksCount > 0);
	let hasError = $derived(Boolean(cluster.error));
</script>

<div
	role="button"
	tabindex="0"
	{onclick}
	onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onclick?.()}
	class="p-5 bento-card text-left transition-all duration-150 cursor-pointer select-none relative overflow-hidden hover-lift {selected
		? 'ring-1 ring-foreground border-foreground shadow-2xs'
		: 'hover:border-stone-400 dark:hover:border-stone-600'}"
>
	<!-- Top Row: Cluster Title and Status Badge -->
	<div class="flex items-start justify-between gap-2 mb-4">
		<div class="min-w-0">
			<h3 class="font-serif font-semibold text-base leading-tight text-foreground truncate" title={cluster.clusterName}>
				{shortName}
			</h3>
			<p class="text-[10px] font-mono text-muted-foreground truncate mt-0.5" title={cluster.clusterName}>
				{cluster.clusterName}
			</p>
		</div>

		{#if hasError}
			<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-[var(--pastel-red-bg)] text-[var(--pastel-red-text)] border border-[var(--pastel-red-border)]">
				<WarningCircle weight="bold" class="size-3" />
				Error
			</span>
		{:else if hasPending}
			<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-[var(--pastel-yellow-bg)] text-[var(--pastel-yellow-text)] border border-[var(--pastel-yellow-border)]">
				<CircleDashed weight="bold" class="size-3" />
				Pending
			</span>
		{:else if isActive}
			<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-[var(--pastel-green-bg)] text-[var(--pastel-green-text)] border border-[var(--pastel-green-border)]">
				<CheckCircle weight="bold" class="size-3" />
				Active
			</span>
		{:else}
			<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-[var(--muted)] text-muted-foreground border border-[var(--border)]">
				{cluster.status}
			</span>
		{/if}
	</div>

	<!-- Bottom Row: Metrics Grid -->
	<div class="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--border)]">
		<div>
			<div class="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Services</div>
			<div class="font-mono text-base font-semibold text-foreground mt-0.5">
				{cluster.activeServicesCount}
			</div>
		</div>
		<div>
			<div class="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Running</div>
			<div class="font-mono text-base font-semibold text-[var(--pastel-green-text)] mt-0.5">
				{cluster.runningTasksCount}
			</div>
		</div>
		<div>
			<div class="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Pending</div>
			<div class="font-mono text-base font-semibold {hasPending ? 'text-[var(--pastel-yellow-text)]' : 'text-muted-foreground'} mt-0.5">
				{cluster.pendingTasksCount}
			</div>
		</div>
	</div>
</div>
