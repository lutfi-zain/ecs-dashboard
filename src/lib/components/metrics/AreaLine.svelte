<script lang="ts">
	import { getLayerCakeContext } from 'layercake';

	interface Props {
		strokeColor?: string;
		fillColor?: string;
		strokeWidth?: number;
	}

	let {
		strokeColor = '#059669',
		fillColor = '#059669',
		strokeWidth = 2
	}: Props = $props();

	const ctx = getLayerCakeContext();

	let linePath = $derived.by(() => {
		const items = (ctx.data as unknown as Array<Record<string, unknown>>) || [];
		if (items.length === 0) return '';

		return items.reduce((path, d, i) => {
			const x = ctx.xGet(d);
			const y = ctx.yGet(d);
			return `${path} ${i === 0 ? 'M' : 'L'} ${x} ${y}`;
		}, '');
	});

	let areaPath = $derived.by(() => {
		const items = (ctx.data as unknown as Array<Record<string, unknown>>) || [];
		if (items.length === 0) return '';

		const firstX = ctx.xGet(items[0]);
		const lastX = ctx.xGet(items[items.length - 1]);
		const baseHeight = ctx.height;

		return `${linePath} L ${lastX} ${baseHeight} L ${firstX} ${baseHeight} Z`;
	});

	const gradientId = `gradient-${Math.random().toString(36).substring(2, 9)}`;
</script>

<defs>
	<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
		<stop offset="0%" stop-color={fillColor} stop-opacity="0.25" />
		<stop offset="100%" stop-color={fillColor} stop-opacity="0.0" />
	</linearGradient>
</defs>

{#if areaPath}
	<path
		d={areaPath}
		fill="url(#{gradientId})"
		class="transition-all duration-300"
	/>
{/if}

{#if linePath}
	<path
		d={linePath}
		fill="none"
		stroke={strokeColor}
		stroke-width={strokeWidth}
		stroke-linecap="round"
		stroke-linejoin="round"
		class="transition-all duration-300"
	/>
{/if}
