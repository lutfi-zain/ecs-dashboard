<script lang="ts">
	import { getLayerCakeContext } from 'layercake';

	interface Props {
		title?: string;
		unit?: string;
	}

	let { title = 'Value', unit = '%' }: Props = $props();

	const ctx = getLayerCakeContext();

	interface Item {
		timestamp: string | Date;
		value: number;
		[key: string]: unknown;
	}

	let activeItem = $state<Item | null>(null);
	let activeX = $state<number | null>(null);
	let activeY = $state<number | null>(null);

	function handleMouseMove(e: MouseEvent) {
		const target = e.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		const mouseX = e.clientX - rect.left;

		const items = (ctx.data as unknown as Item[]) || [];
		if (items.length === 0) return;

		let closest = items[0];
		let minDiff = Infinity;

		for (const item of items) {
			const itemX = ctx.xGet(item);
			const diff = Math.abs(itemX - mouseX);
			if (diff < minDiff) {
				minDiff = diff;
				closest = item;
			}
		}

		activeItem = closest;
		activeX = ctx.xGet(closest);
		activeY = ctx.yGet(closest);
	}

	function handleMouseLeave() {
		activeItem = null;
		activeX = null;
		activeY = null;
	}
</script>

<!-- Interactive Overlay Area -->
<div
	role="region"
	aria-label="Interactive chart surface"
	class="absolute inset-0 cursor-crosshair z-10"
	onmousemove={handleMouseMove}
	onmouseleave={handleMouseLeave}
>
	{#if activeItem && activeX !== null && activeY !== null}
		<!-- Vertical Crosshair Line -->
		<div
			class="absolute top-0 bottom-0 w-px border-l border-dashed border-stone-400 dark:border-stone-500 pointer-events-none"
			style="left: {activeX}px;"
		></div>

		<!-- Hover Point Circle -->
		<div
			class="absolute size-2.5 rounded-full border-2 border-background bg-foreground -translate-x-1/2 -translate-y-1/2 pointer-events-none shadow-xs"
			style="left: {activeX}px; top: {activeY}px;"
		></div>

		<!-- Floating Tooltip Box -->
		<div
			class="absolute pointer-events-none bg-card/95 backdrop-blur-xs border border-border rounded-md px-2.5 py-1.5 shadow-md text-xs font-mono z-20 transition-transform -translate-y-full -translate-x-1/2 mb-2"
			style="left: {Math.max(60, Math.min(ctx.width - 60, activeX))}px; top: {Math.max(40, activeY - 8)}px;"
		>
			<div class="text-[10px] text-muted-foreground whitespace-nowrap">
				{new Date(activeItem.timestamp).toLocaleDateString()} {new Date(activeItem.timestamp).toLocaleTimeString()}
			</div>
			<div class="font-semibold text-foreground mt-0.5">
				{title}: {activeItem.value}{unit}
			</div>
		</div>
	{/if}
</div>
