<script lang="ts">
	import { page } from '$app/state';
	import type { AWSHealthStatus } from '$lib/types/ecs.js';
	import AwsHealthBadge from './AwsHealthBadge.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ArrowClockwise, WifiHigh, List } from 'phosphor-svelte';

	interface Props {
		health: AWSHealthStatus | null;
		lastUpdated?: string | null;
		refreshing?: boolean;
		checkingHealth?: boolean;
		onRefresh?: () => void;
		onCheckHealth?: () => void;
		onToggleMobileNav?: () => void;
	}

	let {
		health,
		lastUpdated = null,
		refreshing = false,
		checkingHealth = false,
		onRefresh,
		onCheckHealth,
		onToggleMobileNav
	}: Props = $props();

	let pageTitle = $derived.by(() => {
		const path = page.url.pathname;
		if (path === '/') return 'Cluster Overview';
		if (path.startsWith('/metrics')) return 'Service Metrics';
		if (path.startsWith('/secrets')) return 'Secrets Manager';
		return 'ECS Dashboard';
	});

	let pageSubtitle = $derived.by(() => {
		const path = page.url.pathname;
		if (path === '/') return 'Monitor clusters, active services, task states, and manage deployments';
		if (path.startsWith('/metrics')) return 'Interactive CPU and memory CloudWatch telemetry time series';
		if (path.startsWith('/secrets')) return 'AWS Secrets Manager configuration, keys, and values';
		return '';
	});
</script>

<header class="h-14 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md px-4 md:px-8 flex items-center justify-between sticky top-0 z-20">
	<!-- Left Title Area -->
	<div class="flex items-center gap-3">
		<Button
			variant="ghost"
			size="icon"
			class="size-8 md:hidden text-muted-foreground"
			onclick={onToggleMobileNav}
			title="Toggle mobile menu"
		>
			<List weight="bold" class="size-4" />
		</Button>

		<div>
			<h1 class="font-serif text-lg font-semibold tracking-tight leading-none text-foreground">
				{pageTitle}
			</h1>
			{#if pageSubtitle}
				<p class="hidden sm:block text-[11px] text-muted-foreground mt-0.5 font-sans leading-none">
					{pageSubtitle}
				</p>
			{/if}
		</div>
	</div>

	<!-- Right Actions & Health Status -->
	<div class="flex items-center gap-2.5">
		{#if lastUpdated}
			<span class="hidden lg:inline-block text-[10px] text-muted-foreground font-mono">
				Updated {lastUpdated}
			</span>
		{/if}

		<AwsHealthBadge {health} checking={checkingHealth} />

		<Button
			variant="outline"
			size="sm"
			class="h-7 px-2.5 text-xs text-foreground border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]"
			onclick={onCheckHealth}
			disabled={checkingHealth}
			title="Test AWS connection"
		>
			<WifiHigh weight="bold" class="size-3.5 mr-1.5 {checkingHealth ? 'animate-pulse' : ''}" />
			<span class="hidden sm:inline">Check AWS</span>
		</Button>

		<Button
			variant="default"
			size="sm"
			class="h-7 px-3 text-xs bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[#2F3437] dark:hover:bg-[#D5D3CE] font-medium"
			onclick={onRefresh}
			disabled={refreshing}
			title="Refresh data"
		>
			<ArrowClockwise weight="bold" class="size-3.5 mr-1.5 {refreshing ? 'animate-spin' : ''}" />
			<span>Refresh</span>
		</Button>
	</div>
</header>
