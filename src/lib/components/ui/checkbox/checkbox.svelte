<script lang="ts">
	import { Check, Minus } from 'phosphor-svelte';
	import { cn } from '$lib/utils.js';

	interface Props {
		checked?: boolean | 'indeterminate';
		indeterminate?: boolean;
		disabled?: boolean;
		class?: string;
		id?: string;
		'aria-label'?: string;
		onCheckedChange?: (checked: boolean) => void;
		[key: string]: unknown;
	}

	let {
		checked = $bindable(false),
		indeterminate = false,
		disabled = false,
		class: className = '',
		id,
		'aria-label': ariaLabel,
		onCheckedChange,
		...restProps
	}: Props = $props();

	let isChecked = $derived(checked === true || checked === 'indeterminate');
	let isIndeterminate = $derived(indeterminate || checked === 'indeterminate');

	function toggle() {
		if (disabled) return;
		const next = !isChecked;
		checked = next;
		onCheckedChange?.(next);
	}
</script>

<button
	type="button"
	role="checkbox"
	aria-checked={isIndeterminate ? 'mixed' : isChecked}
	aria-label={ariaLabel}
	{disabled}
	{id}
	onclick={toggle}
	class={cn(
		"size-4 shrink-0 rounded-[4px] border transition-all duration-150 inline-flex items-center justify-center outline-none select-none",
		isChecked
			? "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]"
			: "border-[var(--border)] bg-[var(--card)] hover:border-stone-400 dark:hover:border-stone-500",
		disabled && "opacity-50 pointer-events-none cursor-not-allowed",
		className
	)}
	{...restProps}
>
	{#if isIndeterminate}
		<Minus weight="bold" class="size-3 text-current" />
	{:else if isChecked}
		<Check weight="bold" class="size-3 text-current" />
	{/if}
</button>
