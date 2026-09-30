<script lang="ts">
	import { getLayerCakeContext } from 'layercake';

	interface Props {
		gridlines?: boolean;
		formatTick?: (d: number) => string;
		ticks?: number[];
	}

	let { gridlines = true, formatTick, ticks }: Props = $props();

	const ctx = getLayerCakeContext();

	let tickVals = $derived.by(() => {
		if (ticks) return ticks;
		if (typeof ctx.yScale.ticks === 'function') {
			return ctx.yScale.ticks(5);
		}
		return [0, 25, 50, 75, 100];
	});

	function defaultFormat(val: number): string {
		return `${val}%`;
	}

	let formatter = $derived(formatTick || defaultFormat);
</script>

<g class="axis y-axis">
	{#each tickVals as tick}
		{@const y = ctx.yScale(tick)}
		<g class="tick" transform="translate(0, {y})">
			{#if gridlines}
				<line
					x1={0}
					x2={ctx.width}
					class="stroke-border/40 [stroke-dasharray:2_2]"
				/>
			{/if}
			<text
				x={-8}
				y={3}
				text-anchor="end"
				class="text-[10px] fill-muted-foreground font-mono"
			>
				{formatter(tick)}
			</text>
		</g>
	{/each}
</g>
