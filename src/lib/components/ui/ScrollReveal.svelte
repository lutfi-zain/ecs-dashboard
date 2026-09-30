<script lang="ts">
	import { onMount, type Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		class?: string;
		delayMs?: number;
	}

	let { children, class: className = '', delayMs = 0 }: Props = $props();

	let visible = $state(false);
	let el = $state<HTMLElement | null>(null);

	onMount(() => {
		if (!el) return;

		// Check prefers-reduced-motion
		const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
		if (mediaQuery.matches) {
			visible = true;
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						if (delayMs > 0) {
							setTimeout(() => {
								visible = true;
							}, delayMs);
						} else {
							visible = true;
						}
						observer.unobserve(entry.target);
					}
				}
			},
			{ threshold: 0.05, rootMargin: '0px 0px -20px 0px' }
		);

		observer.observe(el);

		return () => {
			observer.disconnect();
		};
	});
</script>

<div
	bind:this={el}
	class="transition-[opacity,transform] duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] {visible
		? 'opacity-100 translate-y-0'
		: 'opacity-0 translate-y-3 pointer-events-none'} {className}"
>
	{@render children()}
</div>
