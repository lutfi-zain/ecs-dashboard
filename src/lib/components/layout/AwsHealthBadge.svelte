<script lang="ts">
	import type { AWSHealthStatus } from '$lib/types/ecs.js';
	import { WifiHigh, WifiSlash } from 'phosphor-svelte';

	interface Props {
		health: AWSHealthStatus | null;
		checking?: boolean;
	}

	let { health, checking = false }: Props = $props();

	let isHealthy = $derived(health?.status === 'healthy');
</script>

{#if health}
	<div
		class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border transition-colors {isHealthy
			? 'bg-[var(--pastel-green-bg)] text-[var(--pastel-green-text)] border-[var(--pastel-green-border)]'
			: 'bg-[var(--pastel-red-bg)] text-[var(--pastel-red-text)] border-[var(--pastel-red-border)]'}"
		title={health.message}
	>
		{#if isHealthy}
			<WifiHigh weight="bold" class="size-3 shrink-0" />
		{:else}
			<WifiSlash weight="bold" class="size-3 shrink-0" />
		{/if}
		<span>AWS {health.status}</span>
		{#if health.region}
			<span class="opacity-75">[{health.region}]</span>
		{/if}
	</div>
{:else}
	<div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border border-[var(--border)] text-muted-foreground bg-[var(--muted)]">
		<WifiSlash weight="bold" class="size-3 shrink-0" />
		<span>AWS Checking...</span>
	</div>
{/if}
