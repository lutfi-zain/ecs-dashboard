<script lang="ts">
	import { page } from '$app/state';
	import {
		SquaresFour,
		ChartLineUp,
		Key,
		CaretLeft,
		CaretRight,
		HardDrives
	} from 'phosphor-svelte';
	import ModeToggle from './ModeToggle.svelte';
	import { Button } from '$lib/components/ui/button/index.js';

	interface Props {
		collapsed?: boolean;
		onToggleCollapse?: () => void;
	}

	let { collapsed = $bindable(false), onToggleCollapse }: Props = $props();

	const navItems = [
		{
			label: 'Dashboard',
			href: '/',
			icon: SquaresFour,
			exact: true
		},
		{
			label: 'Metrics',
			href: '/metrics',
			icon: ChartLineUp,
			exact: false
		},
		{
			label: 'Secrets',
			href: '/secrets',
			icon: Key,
			exact: false
		}
	];

	function isItemActive(href: string, exact: boolean) {
		const currentPath = page.url.pathname;
		if (exact) {
			return currentPath === href;
		}
		return currentPath === href || currentPath.startsWith(`${href}/`);
	}
</script>

<aside
	class="flex flex-col h-screen border-r border-[var(--sidebar-border)] bg-[var(--sidebar-background)] text-[var(--sidebar-foreground)] transition-all duration-300 select-none {collapsed ? 'w-16' : 'w-60'}"
>
	<!-- Top Brand / Logo -->
	<div class="h-14 flex items-center px-4 border-b border-[var(--sidebar-border)] justify-between">
		<div class="flex items-center gap-2.5 overflow-hidden">
			<div class="size-7 rounded bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center shrink-0">
				<HardDrives weight="bold" class="size-4" />
			</div>
			{#if !collapsed}
				<div class="flex flex-col min-w-0">
					<span class="font-serif text-sm font-semibold tracking-tight leading-tight truncate">
						ECS Console
					</span>
					<span class="text-[10px] text-muted-foreground font-mono tracking-wider uppercase">
						AWS ECS Dashboard
					</span>
				</div>
			{/if}
		</div>

		<Button
			variant="ghost"
			size="icon"
			class="size-6 text-muted-foreground hover:text-foreground hidden md:flex shrink-0"
			onclick={() => {
				collapsed = !collapsed;
				onToggleCollapse?.();
			}}
			title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
		>
			{#if collapsed}
				<CaretRight weight="bold" class="size-3.5" />
			{:else}
				<CaretLeft weight="bold" class="size-3.5" />
			{/if}
		</Button>
	</div>

	<!-- Navigation Menu -->
	<nav class="flex-1 py-3 px-2 space-y-1">
		{#each navItems as item}
			{@const active = isItemActive(item.href, item.exact)}
			<a
				href={item.href}
				class="flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-colors {active
					? 'bg-[var(--card)] text-foreground border border-[var(--border)] font-semibold shadow-2xs'
					: 'text-muted-foreground hover:bg-[var(--card)]/50 hover:text-foreground'} {collapsed ? 'justify-center px-2' : ''}"
				title={collapsed ? item.label : undefined}
			>
				<item.icon weight="bold" class="size-4 shrink-0 {active ? 'text-foreground' : 'text-muted-foreground'}" />
				{#if !collapsed}
					<span class="truncate">{item.label}</span>
				{/if}
			</a>
		{/each}
	</nav>

	<!-- Footer with Theme Toggle -->
	<div class="p-2 border-t border-[var(--sidebar-border)] flex flex-col gap-1">
		<ModeToggle {collapsed} />
	</div>
</aside>
