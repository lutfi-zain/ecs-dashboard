<script lang="ts">
	import { toggleMode, mode } from 'mode-watcher';
	import { Sun, Moon } from 'phosphor-svelte';
	import { Button } from '$lib/components/ui/button/index.js';

	interface Props {
		collapsed?: boolean;
	}

	let { collapsed = false }: Props = $props();
</script>

<Button
	variant="ghost"
	size={collapsed ? 'icon' : 'sm'}
	onclick={toggleMode}
	class="w-full justify-start text-stone-600 dark:text-stone-400 hover:text-foreground hover:bg-stone-200/50 dark:hover:bg-stone-800/50 transition-colors {collapsed ? 'justify-center p-0' : 'px-3'}"
	title="Toggle theme (Light / Dark)"
>
	<div class="relative size-4 flex items-center justify-center">
		{#if mode.current === 'dark'}
			<Moon weight="bold" class="size-3.5 text-stone-300" />
		{:else}
			<Sun weight="bold" class="size-3.5 text-stone-700" />
		{/if}
	</div>
	{#if !collapsed}
		<span class="ml-2 text-xs font-mono uppercase tracking-wider">
			{mode.current === 'dark' ? 'Dark Theme' : 'Light Theme'}
		</span>
	{/if}
</Button>
