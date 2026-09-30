<script lang="ts">
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';
	import favicon from '$lib/assets/favicon.svg';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import Header from '$lib/components/layout/Header.svelte';
	import type { AWSHealthStatus } from '$lib/types/ecs.js';
	import type { LayoutData } from './$types.js';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	let customHealth = $state<AWSHealthStatus | null>(null);
	let healthState = $derived(customHealth ?? data.health);

	let checkingHealth = $state(false);
	let refreshing = $state(false);
	let sidebarCollapsed = $state(false);
	let mobileNavOpen = $state(false);
	let lastUpdated = $state<string | null>(new Date().toLocaleTimeString());

	async function handleCheckHealth() {
		checkingHealth = true;
		try {
			const res = await fetch('/api/aws-health?force=true');
			if (res.ok) {
				const updated = (await res.json()) as AWSHealthStatus;
				customHealth = updated;
			}
		} catch (err) {
			console.error('Failed to check AWS health:', err);
		} finally {
			checkingHealth = false;
		}
	}

	function handleRefresh() {
		refreshing = true;
		lastUpdated = new Date().toLocaleTimeString();
		const refreshEvent = new CustomEvent('app:refresh');
		window.dispatchEvent(refreshEvent);
		setTimeout(() => {
			refreshing = false;
		}, 800);
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher />

<div class="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans">
	<!-- Desktop Sidebar -->
	<div class="hidden md:flex shrink-0">
		<Sidebar bind:collapsed={sidebarCollapsed} />
	</div>

	<!-- Mobile Sidebar Overlay Drawer -->
	{#if mobileNavOpen}
		<div
			role="button"
			tabindex="0"
			class="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
			onclick={() => (mobileNavOpen = false)}
			onkeydown={(e) => e.key === 'Escape' && (mobileNavOpen = false)}
		></div>
		<div class="fixed inset-y-0 left-0 z-50 w-64 md:hidden shadow-xl">
			<Sidebar collapsed={false} onToggleCollapse={() => (mobileNavOpen = false)} />
		</div>
	{/if}

	<!-- Main Workspace Area -->
	<div class="flex-1 flex flex-col h-full overflow-hidden min-w-0">
		<Header
			health={healthState}
			{lastUpdated}
			{refreshing}
			{checkingHealth}
			onRefresh={handleRefresh}
			onCheckHealth={handleCheckHealth}
			onToggleMobileNav={() => (mobileNavOpen = !mobileNavOpen)}
		/>

		<main class="flex-1 overflow-y-auto px-4 md:px-8 py-8 ambient-depth">
			<div class="max-w-6xl mx-auto w-full">
				{@render children()}
			</div>
		</main>
	</div>
</div>
