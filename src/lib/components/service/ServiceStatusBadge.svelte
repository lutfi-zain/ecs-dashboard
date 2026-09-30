<script lang="ts">
	import { CheckCircle, Clock, WarningCircle } from 'phosphor-svelte';

	interface Props {
		status: string;
	}

	let { status }: Props = $props();

	let normalized = $derived(status.toUpperCase());
	let isHealthy = $derived(normalized === 'ACTIVE');
	let isWarning = $derived(normalized.includes('DRAIN') || normalized.includes('UPDAT') || normalized.includes('PEND'));
</script>

<span
	class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border transition-colors {isHealthy
		? 'bg-[var(--pastel-green-bg)] text-[var(--pastel-green-text)] border-[var(--pastel-green-border)]'
		: isWarning
			? 'bg-[var(--pastel-yellow-bg)] text-[var(--pastel-yellow-text)] border-[var(--pastel-yellow-border)]'
			: 'bg-[var(--pastel-red-bg)] text-[var(--pastel-red-text)] border-[var(--pastel-red-border)]'}"
>
	{#if isHealthy}
		<CheckCircle weight="bold" class="size-3" />
	{:else if isWarning}
		<Clock weight="bold" class="size-3" />
	{:else}
		<WarningCircle weight="bold" class="size-3" />
	{/if}
	<span>{status.toLowerCase()}</span>
</span>
