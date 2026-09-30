<script lang="ts">
	import type { ClusterData } from '$lib/types/ecs.js';
	import { CheckCircle, WarningCircle, CircleDashed, Cpu, HardDrives } from 'phosphor-svelte';

	interface Props {
		clusters: ClusterData[];
		selectedClusterName: string;
		onSelectCluster: (name: string) => void;
	}

	let { clusters, selectedClusterName, onSelectCluster }: Props = $props();

	function getShortName(fullName: string): string {
		const match = fullName.match(/kairos-([a-z]+)-cluster/);
		if (match) return match[1].toUpperCase();
		if (fullName.includes('fe-cluster')) return 'FE';
		return fullName.replace('-cluster-ecs-iac', '');
	}

	let selectedCluster = $derived(
		clusters.find((c) => c.clusterName === selectedClusterName) || clusters[0]
	);

	let otherClusters = $derived(
		clusters.filter((c) => c.clusterName !== selectedClusterName)
	);

	let totalRunningAcrossAll = $derived(
		clusters.reduce((acc, c) => acc + c.runningTasksCount, 0)
	);

	let totalServicesAcrossAll = $derived(
		clusters.reduce((acc, c) => acc + c.activeServicesCount, 0)
	);
</script>

<div class="space-y-4">
	<!-- Asymmetrical Operational Console Ribbon -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
		<!-- Active Primary Cluster Console (Spans 7 cols on desktop) -->
		{#if selectedCluster}
			{@const hasPending = selectedCluster.pendingTasksCount > 0}
			{@const hasError = Boolean(selectedCluster.error)}
			{@const isHealthy = selectedCluster.status === 'ACTIVE'}
			<div class="lg:col-span-7 bento-card p-5 flex flex-col justify-between relative overflow-hidden bg-[var(--card)] border-[var(--border)]">
				<div class="flex items-start justify-between gap-4">
					<div>
						<div class="flex items-center gap-2">
							<span class="inline-block size-2 rounded-full {isHealthy ? 'bg-[var(--pastel-green-text)]' : hasPending ? 'bg-[var(--pastel-yellow-text)]' : 'bg-[var(--pastel-red-text)]'} animate-pulse"></span>
							<span class="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Active Focus</span>
						</div>
						<h2 class="font-serif text-2xl font-semibold text-foreground tracking-tight mt-1">
							{getShortName(selectedCluster.clusterName)} Cluster
						</h2>
						<p class="font-mono text-xs text-muted-foreground mt-0.5 truncate">
							{selectedCluster.clusterName}
						</p>
					</div>

					<div class="text-right">
						{#if hasError}
							<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider bg-[var(--pastel-red-bg)] text-[var(--pastel-red-text)] border border-[var(--pastel-red-border)]">
								<WarningCircle weight="bold" class="size-3.5" />
								Degraded
							</span>
						{:else if hasPending}
							<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider bg-[var(--pastel-yellow-bg)] text-[var(--pastel-yellow-text)] border border-[var(--pastel-yellow-border)]">
								<CircleDashed weight="bold" class="size-3.5" />
								{selectedCluster.pendingTasksCount} Pending
							</span>
						{:else}
							<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider bg-[var(--pastel-green-bg)] text-[var(--pastel-green-text)] border border-[var(--pastel-green-border)]">
								<CheckCircle weight="bold" class="size-3.5" />
								Healthy
							</span>
						{/if}
					</div>
				</div>

				<!-- Capacity breakdown meters -->
				<div class="grid grid-cols-3 gap-4 pt-5 mt-4 border-t border-[var(--border)] tabular-nums">
					<div>
						<span class="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">Active Services</span>
						<span class="font-mono text-xl font-semibold text-foreground mt-0.5 block">
							{selectedCluster.activeServicesCount}
						</span>
					</div>
					<div>
						<span class="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">Running Tasks</span>
						<span class="font-mono text-xl font-semibold text-[var(--pastel-green-text)] mt-0.5 block">
							{selectedCluster.runningTasksCount}
						</span>
					</div>
					<div>
						<span class="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">Pending Transition</span>
						<span class="font-mono text-xl font-semibold {hasPending ? 'text-[var(--pastel-yellow-text)]' : 'text-muted-foreground'} mt-0.5 block">
							{selectedCluster.pendingTasksCount}
						</span>
					</div>
				</div>
			</div>
		{/if}

		<!-- Other Available Clusters Deck (Spans 5 cols on desktop) -->
		<div class="lg:col-span-5 flex flex-col gap-2 justify-between">
			{#each otherClusters as cluster}
				{@const cShort = getShortName(cluster.clusterName)}
				{@const cPending = cluster.pendingTasksCount > 0}
				{@const cHealthy = cluster.status === 'ACTIVE'}
				<div
					role="button"
					tabindex="0"
					onclick={() => onSelectCluster(cluster.clusterName)}
					onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectCluster(cluster.clusterName)}
					class="p-3.5 bento-card cursor-pointer hover:border-stone-400 dark:hover:border-stone-600 transition-all flex items-center justify-between group bg-[var(--card)]"
				>
					<div class="flex items-center gap-3">
						<div class="size-8 rounded bg-[var(--muted)] flex items-center justify-center font-mono text-xs font-semibold text-foreground group-hover:bg-[var(--primary)] group-hover:text-[var(--primary-foreground)] transition-colors">
							{cShort}
						</div>
						<div>
							<h3 class="font-serif font-semibold text-sm text-foreground group-hover:underline">
								{cShort} Cluster
							</h3>
							<p class="font-mono text-[10px] text-muted-foreground">
								{cluster.activeServicesCount} services · {cluster.runningTasksCount} tasks
							</p>
						</div>
					</div>

					<div>
						{#if cluster.error}
							<span class="size-2 rounded-full bg-[var(--pastel-red-text)] block"></span>
						{:else if cPending}
							<span class="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-[var(--pastel-yellow-bg)] text-[var(--pastel-yellow-text)]">
								{cluster.pendingTasksCount} pend
							</span>
						{:else}
							<span class="size-2 rounded-full bg-[var(--pastel-green-text)] block"></span>
						{/if}
					</div>
				</div>
			{/each}

			<!-- System Summary Strip -->
			<div class="px-3.5 py-2.5 rounded border border-dashed border-[var(--border)] bg-[var(--background)] flex items-center justify-between text-xs font-mono text-muted-foreground">
				<span>Global Ecosystem:</span>
				<span class="text-foreground font-semibold tabular-nums">{totalServicesAcrossAll} services across {clusters.length} clusters ({totalRunningAcrossAll} active tasks)</span>
			</div>
		</div>
	</div>
</div>
