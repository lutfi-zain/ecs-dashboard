<script lang="ts">
	import { getLayerCakeContext } from 'layercake';

	interface Props {
		gridlines?: boolean;
		formatTick?: (d: number | Date) => string;
		ticks?: number[];
	}

	let { gridlines = true, formatTick, ticks }: Props = $props();

	const ctx = getLayerCakeContext();

	let tickVals = $derived.by(() => {
		if (ticks) return ticks;
		if (typeof ctx.xScale.ticks === 'function') {
			return ctx.xScale.ticks(6);
		}
		return [];
	});

	function defaultFormat(val: number | Date): string {
		const date = new Date(val);
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	let formatter = $derived(formatTick || defaultFormat);
</script>

<g class="axis x-axis">
	{#each tickVals as tick}
		{@const x = ctx.xScale(tick)}
		<g class="tick" transform="translate({x}, 0)">
			{#if gridlines}
				<line
					y1={0}
					y2={ctx.height}
					class="stroke-border/40 [stroke-dasharray:2_2]"
				/>
			{/if}
			<text
				y={ctx.height + 16}
				text-anchor="middle"
				class="text-[10px] fill-muted-foreground font-mono"
			>
				{formatter(tick)}
			</text>
		</g>
	{/each}
</g>
